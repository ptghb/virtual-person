import { describe, expect, it } from 'vitest';
import { VadDetector } from '../services/vad-detector';
import { getVadDetectorOptions } from '../services/vad-preference.service';

describe('VadDetector', () => {
  it('calibrates noise before accepting speech', () => {
    const detector = new VadDetector({ calibrationMs: 500, speechStartMs: 200 });
    expect(detector.sample(0.04, 0).decision).toBe('none');
    expect(detector.sample(0.04, 300).decision).toBe('none');
    expect(detector.sample(0.08, 600).decision).toBe('speech-candidate');
    expect(detector.sample(0.08, 800).decision).toBe('speech-start');
  });

  it('ends a valid utterance after sustained silence', () => {
    const detector = new VadDetector({
      calibrationMs: 0,
      speechStartMs: 0,
      minimumSpeechMs: 300,
      silenceMs: 500
    });
    expect(detector.sample(0.08, 0).decision).toBe('speech-start');
    detector.sample(0.08, 400);
    detector.sample(0.001, 500);
    expect(detector.sample(0.001, 1000).decision).toBe('speech-end');
  });

  it('discards short noise bursts', () => {
    const detector = new VadDetector({
      calibrationMs: 0,
      speechStartMs: 0,
      minimumSpeechMs: 500,
      silenceMs: 300
    });
    expect(detector.sample(0.08, 0).decision).toBe('speech-start');
    detector.sample(0.001, 100);
    expect(detector.sample(0.001, 400).decision).toBe('discard');
  });

  it('ignores a single loud frame before speech is confirmed', () => {
    const detector = new VadDetector({ calibrationMs: 0, speechStartMs: 200 });
    expect(detector.sample(0.1, 0).decision).toBe('speech-candidate');
    expect(detector.sample(0.001, 50).decision).toBe('candidate-cancel');
    expect(detector.sample(0.1, 100).decision).toBe('speech-candidate');
    expect(detector.sample(0.1, 300).decision).toBe('speech-start');
  });

  it('requires stronger and longer speech while assistant audio is playing', () => {
    const detector = new VadDetector({ calibrationMs: 0, speechStartMs: 200 });
    const echoOptions = { startThresholdScale: 2.2, speechStartMs: 600 };
    expect(detector.sample(0.04, 0, echoOptions).decision).toBe('none');
    expect(detector.sample(0.04, 700, echoOptions).decision).toBe('none');
    expect(detector.sample(0.1, 800, echoOptions).decision).toBe(
      'speech-candidate'
    );
    expect(detector.sample(0.1, 1400, echoOptions).decision).toBe('speech-start');
  });

  it('raises thresholds in a noisy environment', () => {
    const detector = new VadDetector({ calibrationMs: 1000 });
    const initial = detector.sample(0.02, 0);
    let snapshot = initial;
    for (let time = 100; time <= 900; time += 100) {
      snapshot = detector.sample(0.02, time);
    }
    expect(snapshot.startThreshold).toBeGreaterThan(initial.startThreshold);
  });

  it('maps listening preferences to detector options', () => {
    expect(
      getVadDetectorOptions({
        sensitivity: 'high',
        minimumSpeechMs: 200,
        silenceMs: 500
      })
    ).toEqual({
      minimumSpeechMs: 200,
      silenceMs: 500,
      startMultiplier: 2.6
    });
  });
});
