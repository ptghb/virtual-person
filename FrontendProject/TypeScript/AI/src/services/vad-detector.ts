export interface VadDetectorOptions {
  calibrationMs?: number;
  speechStartMs?: number;
  minimumSpeechMs?: number;
  silenceMs?: number;
  startMultiplier?: number;
  stopMultiplier?: number;
  minimumStartThreshold?: number;
  minimumStopThreshold?: number;
}

export interface VadSampleOptions {
  startThresholdScale?: number;
  speechStartMs?: number;
}

export type VadDecision =
  | 'none'
  | 'speech-candidate'
  | 'candidate-cancel'
  | 'speech-start'
  | 'speech-end'
  | 'discard';

export interface VadSnapshot {
  decision: VadDecision;
  noiseFloor: number;
  startThreshold: number;
  stopThreshold: number;
  speechDurationMs: number;
}

export class VadDetector {
  private readonly calibrationMs: number;
  private readonly speechStartMs: number;
  private readonly minimumSpeechMs: number;
  private readonly silenceMs: number;
  private readonly startMultiplier: number;
  private readonly stopMultiplier: number;
  private readonly minimumStartThreshold: number;
  private readonly minimumStopThreshold: number;
  private startedAt: number | null = null;
  private speechCandidateStartedAt: number | null = null;
  private speechStartedAt: number | null = null;
  private silenceStartedAt: number | null = null;
  private noiseFloor = 0.008;

  constructor(options: VadDetectorOptions = {}) {
    this.calibrationMs = options.calibrationMs ?? 800;
    this.speechStartMs = options.speechStartMs ?? 220;
    this.minimumSpeechMs = options.minimumSpeechMs ?? 320;
    this.silenceMs = options.silenceMs ?? 800;
    this.startMultiplier = options.startMultiplier ?? 3.2;
    this.stopMultiplier = options.stopMultiplier ?? 1.8;
    this.minimumStartThreshold = options.minimumStartThreshold ?? 0.025;
    this.minimumStopThreshold = options.minimumStopThreshold ?? 0.015;
  }

  sample(
    rms: number,
    now: number,
    sampleOptions: VadSampleOptions = {}
  ): VadSnapshot {
    this.startedAt ??= now;
    const startThreshold = Math.max(
      this.minimumStartThreshold,
      this.noiseFloor * this.startMultiplier
    ) * (sampleOptions.startThresholdScale ?? 1);
    const stopThreshold = Math.max(
      this.minimumStopThreshold,
      this.noiseFloor * this.stopMultiplier
    );

    if (this.speechStartedAt === null) {
      if (now - this.startedAt < this.calibrationMs || rms < startThreshold) {
        const candidateCancelled = this.speechCandidateStartedAt !== null;
        this.speechCandidateStartedAt = null;
        this.learnNoise(rms);
        return this.snapshot(
          candidateCancelled ? 'candidate-cancel' : 'none',
          startThreshold,
          stopThreshold,
          0
        );
      }
      const requiredSpeechStartMs =
        sampleOptions.speechStartMs ?? this.speechStartMs;
      if (this.speechCandidateStartedAt === null) {
        this.speechCandidateStartedAt = now;
        if (requiredSpeechStartMs > 0) {
          return this.snapshot(
            'speech-candidate',
            startThreshold,
            stopThreshold,
            0
          );
        }
      }
      if (now - this.speechCandidateStartedAt < requiredSpeechStartMs) {
        return this.snapshot('none', startThreshold, stopThreshold, 0);
      }
      this.speechStartedAt = this.speechCandidateStartedAt;
      this.speechCandidateStartedAt = null;
      this.silenceStartedAt = null;
      return this.snapshot(
        'speech-start',
        startThreshold,
        stopThreshold,
        now - this.speechStartedAt
      );
    }

    const speechDuration = now - this.speechStartedAt;
    if (rms < stopThreshold) {
      this.silenceStartedAt ??= now;
      if (now - this.silenceStartedAt >= this.silenceMs) {
        const decision =
          speechDuration >= this.minimumSpeechMs ? 'speech-end' : 'discard';
        this.resetSpeech();
        return this.snapshot(
          decision,
          startThreshold,
          stopThreshold,
          speechDuration
        );
      }
    } else {
      this.silenceStartedAt = null;
    }

    return this.snapshot(
      'none',
      startThreshold,
      stopThreshold,
      speechDuration
    );
  }

  reset(): void {
    this.startedAt = null;
    this.resetSpeech();
    this.noiseFloor = 0.008;
  }

  private learnNoise(rms: number): void {
    const bounded = Math.min(rms, this.noiseFloor * 2.5);
    this.noiseFloor = this.noiseFloor * 0.94 + bounded * 0.06;
  }

  private resetSpeech(): void {
    this.speechCandidateStartedAt = null;
    this.speechStartedAt = null;
    this.silenceStartedAt = null;
  }

  private snapshot(
    decision: VadDecision,
    startThreshold: number,
    stopThreshold: number,
    speechDurationMs: number
  ): VadSnapshot {
    return {
      decision,
      noiseFloor: this.noiseFloor,
      startThreshold,
      stopThreshold,
      speechDurationMs
    };
  }
}
