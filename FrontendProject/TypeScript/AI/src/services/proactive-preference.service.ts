import { useSyncExternalStore } from 'react';

export interface ProactivePreferences {
  enabled: boolean;
  desktopNotifications: boolean;
  quietStart: number;
  quietEnd: number;
  cooldownHours: number;
}

const KEY = 'xiaofan.proactive-preferences.v1';
const DEFAULTS: ProactivePreferences = {
  enabled: true,
  desktopNotifications: true,
  quietStart: 23,
  quietEnd: 8,
  cooldownHours: 12
};
const listeners = new Set<() => void>();
let snapshot = read();

function read(): ProactivePreferences {
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

export function saveProactivePreferences(
  value: Partial<ProactivePreferences>
) {
  localStorage.setItem(KEY, JSON.stringify({ ...snapshot, ...value }));
  emit();
}

export function getProactivePreferences() {
  return snapshot;
}

export function useProactivePreferences() {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => DEFAULTS
  );
}

export function isProactiveQuietHour(hour: number, preferences = snapshot) {
  const { quietStart, quietEnd } = preferences;
  return quietStart > quietEnd
    ? hour >= quietStart || hour < quietEnd
    : hour >= quietStart && hour < quietEnd;
}
