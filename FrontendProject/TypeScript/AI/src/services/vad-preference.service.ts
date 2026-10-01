import { useSyncExternalStore } from 'react';
import type { VadDetectorOptions } from './vad-detector';

export interface VadPreferences {
  sensitivity: 'low' | 'balanced' | 'high';
  minimumSpeechMs: number;
  silenceMs: number;
}

const KEY = 'xiaofan.vad-preferences.v1';
const DEFAULTS: VadPreferences = {
  sensitivity: 'balanced',
  minimumSpeechMs: 320,
  silenceMs: 1200
};
const listeners = new Set<() => void>();
let snapshot = read();

function read(): VadPreferences {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    // 旧默认值 800ms 容易在自然停顿、换气时提前截断一句话。
    if (stored.silenceMs === 800) stored.silenceMs = 1200;
    return { ...DEFAULTS, ...stored };
  } catch {
    return DEFAULTS;
  }
}

function emit() {
  snapshot = read();
  listeners.forEach(listener => listener());
}

export function saveVadPreferences(value: Partial<VadPreferences>) {
  localStorage.setItem(KEY, JSON.stringify({ ...snapshot, ...value }));
  emit();
}

export function getVadPreferences() {
  return snapshot;
}

export function useVadPreferences() {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => DEFAULTS
  );
}

export function getVadDetectorOptions(
  preferences = snapshot
): Pick<VadDetectorOptions, 'minimumSpeechMs' | 'silenceMs' | 'startMultiplier'> {
  const startMultiplier =
    preferences.sensitivity === 'high'
      ? 2.6
      : preferences.sensitivity === 'low'
        ? 3.8
        : 3.2;
  return {
    minimumSpeechMs: preferences.minimumSpeechMs,
    silenceMs: preferences.silenceMs,
    startMultiplier
  };
}
