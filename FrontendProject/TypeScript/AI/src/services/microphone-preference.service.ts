import { useSyncExternalStore } from 'react';

export interface MicrophonePreferences {
  deviceId: string;
}

const KEY = 'xiaofan.microphone-preferences.v1';
const DEFAULTS: MicrophonePreferences = { deviceId: '' };
const listeners = new Set<() => void>();
let snapshot = read();

function read(): MicrophonePreferences {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return DEFAULTS;
  }
}

function emit() {
  snapshot = read();
  listeners.forEach(listener => listener());
}

export function saveMicrophonePreferences(
  value: Partial<MicrophonePreferences>
) {
  localStorage.setItem(KEY, JSON.stringify({ ...snapshot, ...value }));
  emit();
}

export function getMicrophonePreferences() {
  return snapshot;
}

export function useMicrophonePreferences() {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => DEFAULTS
  );
}

export function microphoneAudioConstraints(
  deviceId = snapshot.deviceId
): MediaTrackConstraints {
  return {
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true
  };
}
