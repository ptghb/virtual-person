import { afterEach, describe, expect, it, vi } from 'vitest';
import { AsrTurnTracker } from '../services/asr-turn-tracker';

describe('AsrTurnTracker', () => {
  afterEach(() => vi.useRealTimers());

  it('finishes the current turn with duration', () => {
    let now = 100;
    const tracker = new AsrTurnTracker(20_000, () => undefined, () => now);
    tracker.start('turn-a');
    now = 450;
    expect(tracker.finish('success')).toEqual({
      turnId: 'turn-a',
      result: 'success',
      durationMs: 350
    });
    expect(tracker.isCurrent()).toBe(false);
  });

  it('rejects a stale turn id', () => {
    const tracker = new AsrTurnTracker(20_000, () => undefined, () => 0);
    tracker.start('turn-new');
    expect(tracker.isCurrent('turn-old')).toBe(false);
    expect(tracker.isCurrent('turn-new')).toBe(true);
    tracker.cancel();
  });

  it('recovers after timeout', () => {
    vi.useFakeTimers();
    const timedOut = vi.fn();
    const tracker = new AsrTurnTracker(1000, timedOut, () => Date.now());
    tracker.start('turn-a');
    vi.advanceTimersByTime(1000);
    expect(timedOut).toHaveBeenCalledWith({
      turnId: 'turn-a',
      result: 'timeout',
      durationMs: 1000
    });
    expect(tracker.isCurrent()).toBe(false);
  });
});
