import { beforeEach, describe, expect, it } from 'vitest';
import {
  recordInterruptLatency,
  recordAsrLatency,
  recordVoiceMetric,
  resetVoiceMetrics,
  summarizeVoiceMetrics
} from '../services/voice-metrics.service';

describe('voice metrics', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      getItem: (): string | null => null,
      setItem: (): void => undefined
    } as unknown as Storage;
    resetVoiceMetrics();
  });

  it('calculates failure and discard rates', () => {
    recordVoiceMetric('vadAccepted');
    recordVoiceMetric('vadDiscarded');
    recordVoiceMetric('asrSucceeded');
    recordVoiceMetric('asrFailed');
    const summary = summarizeVoiceMetrics();
    expect(summary.vadDiscardRate).toBe(0.5);
    expect(summary.asrFailureRate).toBe(0.5);
  });

  it('calculates interrupt latency percentiles', () => {
    [10, 20, 30, 40, 50].forEach(recordInterruptLatency);
    const summary = summarizeVoiceMetrics();
    expect(summary.interruptP50).toBe(30);
    expect(summary.interruptP95).toBe(50);
  });

  it('counts stale ASR responses', () => {
    recordVoiceMetric('staleAsrResponses');
    recordVoiceMetric('staleAsrResponses');
    expect(summarizeVoiceMetrics().staleAsrResponses).toBe(2);
  });

  it('calculates ASR latency percentiles', () => {
    [100, 200, 300, 400].forEach(recordAsrLatency);
    const summary = summarizeVoiceMetrics();
    expect(summary.asrP50).toBe(200);
    expect(summary.asrP95).toBe(400);
  });
});
