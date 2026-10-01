import { useSyncExternalStore } from 'react';

export interface VoiceMetrics {
  vadAccepted: number;
  vadDiscarded: number;
  asrSucceeded: number;
  asrFailed: number;
  interruptLatencies: number[];
  staleAsrResponses: number;
  asrTimeouts: number;
  asrLatencies: number[];
}

export interface VoiceMetricsSummary extends VoiceMetrics {
  vadDiscardRate: number;
  asrFailureRate: number;
  interruptP50: number | null;
  interruptP95: number | null;
  asrP50: number | null;
  asrP95: number | null;
}

const KEY = 'xiaofan.voice-metrics.v1';
const EMPTY: VoiceMetrics = {
  vadAccepted: 0,
  vadDiscarded: 0,
  asrSucceeded: 0,
  asrFailed: 0,
  interruptLatencies: [],
  staleAsrResponses: 0,
  asrTimeouts: 0,
  asrLatencies: []
};
const listeners = new Set<() => void>();
let snapshot = read();

function read(): VoiceMetrics {
  if (typeof window === 'undefined') return EMPTY;
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return EMPTY;
  }
}

function write(metrics: VoiceMetrics) {
  localStorage.setItem(KEY, JSON.stringify(metrics));
  snapshot = metrics;
  listeners.forEach(listener => listener());
}

export function recordVoiceMetric(
  metric:
    | 'vadAccepted'
    | 'vadDiscarded'
    | 'asrSucceeded'
    | 'asrFailed'
    | 'staleAsrResponses'
    | 'asrTimeouts'
) {
  write({ ...snapshot, [metric]: snapshot[metric] + 1 });
}

export function recordInterruptLatency(milliseconds: number) {
  write({
    ...snapshot,
    interruptLatencies: [
      ...snapshot.interruptLatencies,
      Math.max(0, Math.round(milliseconds))
    ].slice(-200)
  });
}

export function recordAsrLatency(milliseconds: number) {
  write({
    ...snapshot,
    asrLatencies: [
      ...snapshot.asrLatencies,
      Math.max(0, Math.round(milliseconds))
    ].slice(-200)
  });
}

export function resetVoiceMetrics() {
  write({ ...EMPTY });
}

function percentile(values: number[], ratio: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * ratio) - 1];
}

export function summarizeVoiceMetrics(
  metrics: VoiceMetrics = snapshot
): VoiceMetricsSummary {
  const vadTotal = metrics.vadAccepted + metrics.vadDiscarded;
  const asrTotal = metrics.asrSucceeded + metrics.asrFailed;
  return {
    ...metrics,
    vadDiscardRate: vadTotal ? metrics.vadDiscarded / vadTotal : 0,
    asrFailureRate: asrTotal ? metrics.asrFailed / asrTotal : 0,
    interruptP50: percentile(metrics.interruptLatencies, 0.5),
    interruptP95: percentile(metrics.interruptLatencies, 0.95),
    asrP50: percentile(metrics.asrLatencies, 0.5),
    asrP95: percentile(metrics.asrLatencies, 0.95)
  };
}

export function useVoiceMetrics() {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => EMPTY
  );
}
