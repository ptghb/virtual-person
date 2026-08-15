import { useCallback, useEffect, useRef, useState } from 'react';
import type { WebSocketManager } from '../websocketmanager';

export function useVoiceRecorder(manager: WebSocketManager, enabled: boolean) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
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

      manager.send({
        type: 'control',
        data: {
          action: 'start_audio_stream',
          client_id: manager.getClientId(),
          timestamp: new Date().toISOString()
        }
      });

      recorder.ondataavailable = event => {
        if (!event.data.size || manager.getState() !== 'connected') return;
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result !== 'string') return;
          const chunk = reader.result.split(',')[1] || '';
          if (!chunk) return;
          manager.send({
            type: 'audio',
            data: {
              audioFormat: 'webm',
              sample_rate: 16000,
              channels: 1,
              chunk,
              is_final: false,
              client_id: manager.getClientId(),
              timestamp: new Date().toISOString()
            }
          });
        };
        reader.readAsDataURL(event.data);
      };

      recorder.onstop = () => {
        setIsRecording(false);
        stopTracks();
        recorderRef.current = null;
        if (manager.getState() === 'connected') {
          manager.send({
            type: 'control',
            data: {
              action: 'stop_audio_stream',
              client_id: manager.getClientId(),
              timestamp: new Date().toISOString()
            }
          });
        }
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
