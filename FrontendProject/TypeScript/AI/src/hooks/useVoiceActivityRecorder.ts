import { useCallback, useEffect, useRef, useState } from 'react';
import { avatarService } from '../services/avatar.service';
import { VadDetector } from '../services/vad-detector';
import {
  getVadDetectorOptions,
  useVadPreferences
} from '../services/vad-preference.service';
import type { WebSocketManager } from '../websocketmanager';
import {
  microphoneAudioConstraints,
  useMicrophonePreferences
} from '../services/microphone-preference.service';
import {
  recordInterruptLatency,
  recordAsrLatency,
  recordVoiceMetric
} from '../services/voice-metrics.service';
import { AsrTurnTracker } from '../services/asr-turn-tracker';

type VadState = 'off' | 'waiting' | 'speaking' | 'processing';

export function useVoiceActivityRecorder(
  manager: WebSocketManager,
  enabled: boolean
) {
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speechConfirmedRef = useRef(false);
  const detectorRef = useRef(new VadDetector());
  const vadPreferences = useVadPreferences();
  const microphonePreferences = useMicrophonePreferences();
  const processingRef = useRef(false);
  const queuedRecordingRef = useRef<{ chunks: Blob[]; mimeType: string } | null>(
    null
  );
  const interruptStartedRef = useRef(0);
  const activeTurnIdRef = useRef('');
  const trackerRef = useRef<AsrTurnTracker | null>(null);
  const [state, setState] = useState<VadState>('off');
  const [level, setLevel] = useState(0);
  const [error, setError] = useState('');
  const [interruptLatencyMs, setInterruptLatencyMs] = useState<number | null>(
    null
  );
  const [diagnostics, setDiagnostics] = useState({
    noiseFloor: 0,
    startThreshold: 0,
    stopThreshold: 0,
    recordingMs: 0
  });
  trackerRef.current ??= new AsrTurnTracker(20_000, completion => {
    recordVoiceMetric('asrFailed');
    recordVoiceMetric('asrTimeouts');
    recordAsrLatency(completion.durationMs);
    setError('语音识别超时，自动聆听已继续');
    finishProcessingRef.current();
  });
  const finishProcessingRef = useRef<() => void>(() => undefined);

  const sendRecording = useCallback(
    async (chunks: Blob[], mimeType: string) => {
      if (!chunks.length || manager.getState() !== 'connected') {
        setState('waiting');
        return;
      }
      if (processingRef.current) {
        queuedRecordingRef.current = { chunks, mimeType };
        setState('processing');
        return;
      }
      processingRef.current = true;
      const audioTurnId = crypto.randomUUID();
      activeTurnIdRef.current = audioTurnId;
      trackerRef.current?.start(audioTurnId);
      setState('processing');
      const bytes = new Uint8Array(
        await new Blob(chunks, { type: mimeType }).arrayBuffer()
      );
      let binary = '';
      const size = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += size) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + size));
      }
      manager.send({
        type: 'control',
        data: { action: 'start_audio_stream', audio_turn_id: audioTurnId }
      });
      manager.send({
        type: 'audio',
        data: {
          audioFormat: 'webm',
          sample_rate: 16000,
          channels: 1,
          chunk: btoa(binary),
          is_final: true,
          audio_turn_id: audioTurnId
        }
      });
      manager.send({
        type: 'control',
        data: { action: 'stop_audio_stream', audio_turn_id: audioTurnId }
      });
    },
    [manager]
  );

  const finishProcessing = useCallback(() => {
    processingRef.current = false;
    const queued = queuedRecordingRef.current;
    queuedRecordingRef.current = null;
    if (queued) {
      void sendRecording(queued.chunks, queued.mimeType);
    } else {
      setState('waiting');
    }
  }, [sendRecording]);
  finishProcessingRef.current = finishProcessing;

  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    void contextRef.current?.close();
    contextRef.current = null;
    chunksRef.current = [];
    speechConfirmedRef.current = false;
    queuedRecordingRef.current = null;
    processingRef.current = false;
    trackerRef.current?.cancel();
    detectorRef.current.reset();
    setLevel(0);
    setState('off');
  }, []);

  const start = useCallback(async () => {
    if (!enabled || manager.getState() !== 'connected') return;
    stop();
    detectorRef.current = new VadDetector(getVadDetectorOptions(vadPreferences));
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: microphoneAudioConstraints(
          microphonePreferences.deviceId,
          microphonePreferences
        )
      });
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      streamRef.current = stream;
      contextRef.current = context;
      setState('waiting');

      const sample = () => {
        analyser.getByteTimeDomainData(samples);
        const rms = Math.sqrt(
          samples.reduce((sum, value) => {
            const normalized = (value - 128) / 128;
            return sum + normalized * normalized;
          }, 0) / samples.length
        );
        setLevel(Math.min(1, rms * 8));
        const now = performance.now();
        const assistantAudioPlaying = avatarService.isAudioPlaying();
        const assistantAudioCoolingDown =
          !assistantAudioPlaying && avatarService.isInAudioCooldown(500);
        const snapshot = detectorRef.current.sample(
          assistantAudioCoolingDown ? 0 : rms,
          now,
          assistantAudioPlaying
            ? { startThresholdScale: 2.2, speechStartMs: 600 }
            : undefined
        );
        const decision = snapshot.decision;
        setDiagnostics({
          noiseFloor: snapshot.noiseFloor,
          startThreshold: snapshot.startThreshold,
          stopThreshold: snapshot.stopThreshold,
          recordingMs: snapshot.speechDurationMs
        });

        if (decision === 'speech-candidate' && !recorderRef.current) {
          chunksRef.current = [];
          const recorder = new MediaRecorder(stream, { mimeType });
          recorderRef.current = recorder;
          recorder.ondataavailable = event => {
            if (event.data.size) chunksRef.current.push(event.data);
          };
          recorder.onstop = () => {
            const chunks = chunksRef.current;
            chunksRef.current = [];
            recorderRef.current = null;
            if (speechConfirmedRef.current) {
              speechConfirmedRef.current = false;
              void sendRecording(chunks, mimeType);
            } else {
              setState(processingRef.current ? 'processing' : 'waiting');
            }
          };
          recorder.start(150);
        } else if (decision === 'speech-start') {
          speechConfirmedRef.current = true;
          avatarService.stopAudio();
          interruptStartedRef.current = performance.now();
          manager.interruptAssistant();
          // speechStartMs=0 的兼容路径：没有候选阶段时立即开始录音。
          if (!recorderRef.current) {
            chunksRef.current = [];
            const recorder = new MediaRecorder(stream, { mimeType });
            recorderRef.current = recorder;
            recorder.ondataavailable = event => {
              if (event.data.size) chunksRef.current.push(event.data);
            };
            recorder.onstop = () => {
              const chunks = chunksRef.current;
              chunksRef.current = [];
              recorderRef.current = null;
              speechConfirmedRef.current = false;
              void sendRecording(chunks, mimeType);
            };
            recorder.start(150);
          }
          setState('speaking');
        } else if (
          decision === 'candidate-cancel' &&
          recorderRef.current?.state === 'recording' &&
          !speechConfirmedRef.current
        ) {
          recorderRef.current.stop();
        } else if (
          decision === 'speech-end' &&
          recorderRef.current?.state === 'recording'
        ) {
          recordVoiceMetric('vadAccepted');
          recorderRef.current.stop();
        } else if (
          decision === 'discard' &&
          recorderRef.current?.state === 'recording'
        ) {
          recordVoiceMetric('vadDiscarded');
          recorderRef.current.onstop = () => {
            recorderRef.current = null;
            chunksRef.current = [];
            speechConfirmedRef.current = false;
            setState(processingRef.current ? 'processing' : 'waiting');
          };
          recorderRef.current.stop();
        }
        frameRef.current = requestAnimationFrame(sample);
      };
      sample();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法启动自动聆听');
      stop();
    }
  }, [
    enabled,
    manager,
    microphonePreferences,
    sendRecording,
    stop,
    vadPreferences
  ]);

  useEffect(
    () =>
      manager.subscribeMessage(message => {
        if (
          processingRef.current &&
          message.audioTurnId &&
          !trackerRef.current?.isCurrent(message.audioTurnId) &&
          (message.protocolEvent === 'speech.transcription' ||
            message.protocolEvent === 'response')
        ) {
          recordVoiceMetric('staleAsrResponses');
          return;
        }
        if (
          message.streamEvent === 'interrupted' &&
          interruptStartedRef.current
        ) {
          const latency = Math.round(
            performance.now() - interruptStartedRef.current
          );
          setInterruptLatencyMs(latency);
          recordInterruptLatency(latency);
          interruptStartedRef.current = 0;
        }
        if (
          message.protocolEvent === 'speech.transcription' ||
          (message.protocolEvent === 'response' &&
            message.isError &&
            processingRef.current)
        ) {
          const completion = trackerRef.current?.finish(
            message.protocolEvent === 'speech.transcription'
              ? 'success'
              : 'failure'
          );
          if (completion) recordAsrLatency(completion.durationMs);
          recordVoiceMetric(
            message.protocolEvent === 'speech.transcription'
              ? 'asrSucceeded'
              : 'asrFailed'
          );
          finishProcessing();
        }
      }),
    [finishProcessing, manager]
  );

  useEffect(() => stop, [stop]);
  return {
    state,
    level,
    error,
    interruptLatencyMs,
    diagnostics,
    start,
    stop
  };
}
