export type AsrTurnResult = 'success' | 'failure' | 'timeout';

export interface AsrTurnCompletion {
  turnId: string;
  result: AsrTurnResult;
  durationMs: number;
}

export class AsrTurnTracker {
  private turnId = '';
  private startedAt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly timeoutMs: number,
    private readonly onTimeout: (completion: AsrTurnCompletion) => void,
    private readonly now: () => number = () => performance.now()
  ) {}

  start(turnId: string): void {
    this.clearTimer();
    this.turnId = turnId;
    this.startedAt = this.now();
    this.timer = setTimeout(() => {
      const completion = this.finish('timeout');
      if (completion) this.onTimeout(completion);
    }, this.timeoutMs);
  }

  finish(result: AsrTurnResult): AsrTurnCompletion | null {
    if (!this.turnId) return null;
    const completion = {
      turnId: this.turnId,
      result,
      durationMs: Math.max(0, Math.round(this.now() - this.startedAt))
    };
    this.turnId = '';
    this.startedAt = 0;
    this.clearTimer();
    return completion;
  }

  isCurrent(turnId?: string): boolean {
    return Boolean(this.turnId) && (!turnId || turnId === this.turnId);
  }

  cancel(): void {
    this.turnId = '';
    this.startedAt = 0;
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}
