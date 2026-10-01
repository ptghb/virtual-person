import { useCallback, useEffect, useRef, useState } from 'react';
import type { WebSocketManager } from '../websocketmanager';
import {
  microphoneAudioConstraints,
  useMicrophonePreferences
} from '../services/microphone-preference.service';
import {
  recordAsrLatency,
  recordVoiceMetric
} from '../services/voice-metrics.service';
import { AsrTurnTracker } from '../services/asr-turn-tracker';

export function useVoiceRecorder(manager: WebSocketManager, enabled: boolean) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const microphonePreferences = useMicrophonePreferences();
  const processingRef = useRef(false);
  const activeTurnIdRef = useRef('');
  const trackerRef = useRef<AsrTurnTracker | null>(null);
  trackerRef.current ??= new AsrTurnTracker(20_000, completion => {
    processingRef.current = false;
    recordVoiceMetric('asrFailed');
    recordVoiceMetric('asrTimeouts');
    recordAsrLatency(completion.durationMs);
    setError('语音识别超时，请重试');
  });

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
  }, []);

  const startRecording = useCallback(async () => {
    if (!enabled || manager.getState() !== 'connected') return;
    setError('');
    try {
      manager.interruptAssistant();
      const audioTurnId = crypto.randomUUID();
      activeTurnIdRef.current = audioTurnId;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: microphoneAudioConstraints(microphonePreferences.deviceId)
      });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      manager.send({
        type: 'control',
        data: {
          action: 'start_audio_stream',
          client_id: manager.getClientId(),
          timestamp: new Date().toISOString(),
          audio_turn_id: audioTurnId
        }
      });

      recorder.ondataavailable = event => {
        if (event.data.size) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        setIsRecording(false);
        stopTracks();
        recorderRef.current = null;
        const recordedChunks = chunksRef.current;
        chunksRef.current = [];

        void (async () => {
          if (
            manager.getState() !== 'connected' ||
            recordedChunks.length === 0
          ) {
            setError('没有录到有效的语音数据');
            return;
          }

          try {
            // 停止后一次性发送完整 WebM，避免 FileReader 尚未完成时
            // stop_audio_stream 已先到达后端，导致最后一块音频被丢弃。
            const audioBlob = new Blob(recordedChunks, { type: mimeType });
            const bytes = new Uint8Array(await audioBlob.arrayBuffer());
            let binary = '';
            const batchSize = 0x8000;
            for (let offset = 0; offset < bytes.length; offset += batchSize) {
              binary += String.fromCharCode(
                ...bytes.subarray(offset, offset + batchSize)
              );
            }

            manager.send({
              type: 'audio',
              data: {
                audioFormat: 'webm',
                sample_rate: 16000,
                channels: 1,
                chunk: btoa(binary),
                is_final: true,
                client_id: manager.getClientId(),
                timestamp: new Date().toISOString(),
                audio_turn_id: audioTurnId
              }
            });
            manager.send({
              type: 'control',
              data: {
                action: 'stop_audio_stream',
                client_id: manager.getClientId(),
                timestamp: new Date().toISOString(),
                audio_turn_id: audioTurnId
              }
            });
            processingRef.current = true;
            trackerRef.current?.start(audioTurnId);
          } catch (reason) {
            setError(
              reason instanceof Error ? reason.message : '录音数据处理失败'
            );
          }
        })();
      };

      recorder.start(150);
      setIsRecording(true);
    } catch (reason) {
      stopTracks();
      setIsRecording(false);
      setError(
        reason instanceof Error ? reason.message : '无法访问麦克风，请检查权限'
      );
    }
  }, [enabled, manager, microphonePreferences.deviceId, stopTracks]);

  useEffect(
    () =>
      manager.subscribeMessage(message => {
        if (!processingRef.current) return;
        if (
          message.audioTurnId &&
          !trackerRef.current?.isCurrent(message.audioTurnId)
        ) {
          recordVoiceMetric('staleAsrResponses');
          return;
        }
        if (message.protocolEvent === 'speech.transcription') {
          processingRef.current = false;
          const completion = trackerRef.current?.finish('success');
          if (completion) recordAsrLatency(completion.durationMs);
          recordVoiceMetric('asrSucceeded');
        } else if (
          message.protocolEvent === 'response' &&
          message.isError
        ) {
          processingRef.current = false;
          const completion = trackerRef.current?.finish('failure');
          if (completion) recordAsrLatency(completion.durationMs);
          recordVoiceMetric('asrFailed');
        }
      }),
    [manager]
  );

  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }
      stopTracks();
      trackerRef.current?.cancel();
    },
    [stopTracks]
  );

  return { isRecording, error, startRecording, stopRecording };
}
