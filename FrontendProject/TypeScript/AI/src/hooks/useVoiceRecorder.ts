import { useCallback, useEffect, useRef, useState } from 'react';
import type { WebSocketManager } from '../websocketmanager';

export function useVoiceRecorder(manager: WebSocketManager, enabled: boolean) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');

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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
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
          timestamp: new Date().toISOString()
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
                timestamp: new Date().toISOString()
              }
            });
            manager.send({
              type: 'control',
              data: {
                action: 'stop_audio_stream',
                client_id: manager.getClientId(),
                timestamp: new Date().toISOString()
              }
            });
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
  }, [enabled, manager, stopTracks]);

  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }
      stopTracks();
    },
    [stopTracks]
  );

  return { isRecording, error, startRecording, stopRecording };
}
