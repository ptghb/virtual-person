import { useCallback, useEffect, useRef, useState } from 'react';

export function useHearingMonitor() {
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState('');

  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    void contextRef.current?.close();
    contextRef.current = null;
    setLevel(0);
    setIsListening(false);
  }, []);

  const start = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      const values = new Uint8Array(analyser.frequencyBinCount);
      streamRef.current = stream;
      contextRef.current = context;
      setIsListening(true);

      const sample = () => {
        analyser.getByteFrequencyData(values);
        const average =
          values.reduce((sum, value) => sum + value, 0) / values.length / 255;
        setLevel(Math.min(1, average * 2.5));
        frameRef.current = requestAnimationFrame(sample);
      };
      sample();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法开启持续聆听');
      stop();
    }
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { isListening, level, error, start, stop };
}
