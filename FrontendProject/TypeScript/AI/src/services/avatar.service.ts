import { LAppDelegate } from '../lappdelegate';
import { setSelectedAvatarModel } from './avatar-preference.service';

interface StreamingAudioItem {
  replyId: string;
  sequence: number;
  audio: HTMLAudioElement;
}

class AvatarService {
  private streamingQueue: StreamingAudioItem[] = [];
  private streamingReplyId = '';
  private streamingGeneration = 0;
  private processingStreamingQueue = false;

  private getManager() {
    const delegate = LAppDelegate.getInstance();
    if (!delegate._subdelegates || delegate._subdelegates.getSize() === 0) {
      throw new Error('Live2D 尚未初始化');
    }
    return delegate._subdelegates.at(0).getLive2DManager();
  }

  public getCurrentModelName(): string {
    try {
      return this.getManager().getCurrentModelName() || 'Hiyori';
    } catch {
      return 'Hiyori';
    }
  }

  public previewModel(modelName: string): boolean {
    try {
      this.stopAudio();
      return this.getManager().changeModel(modelName);
    } catch (error) {
      console.error('[AvatarService] 切换虚拟人物失败:', error);
      return false;
    }
  }

  public selectModel(modelName: string): boolean {
    if (!this.previewModel(modelName)) return false;
    setSelectedAvatarModel(modelName);
    return true;
  }

  public playMotion(index: number): void {
    try {
      this.getManager().playMotionByNo(index);
    } catch (error) {
      console.error('[AvatarService] 播放动作失败:', error);
    }
  }

  public hitTestClientPoint(clientX: number, clientY: number): boolean {
    try {
      return this.getManager().hitTestClientPoint(clientX, clientY);
    } catch {
      return false;
    }
  }

  public playRandomTouchMotion(): void {
    try {
      this.getManager().playRandomTouchMotion();
    } catch (error) {
      console.error('[AvatarService] 播放触摸动作失败:', error);
    }
  }

  public setPointerFollowSuspended(suspended: boolean): void {
    try {
      const delegate = LAppDelegate.getInstance();
      if (!delegate._subdelegates || delegate._subdelegates.getSize() === 0) {
        return;
      }
      delegate._subdelegates.at(0).setPointerFollowSuspended(suspended);
      if (!suspended) {
        this.lookAtNormalizedPoint(null);
      }
    } catch (error) {
      console.error('[AvatarService] 设置鼠标视线跟随状态失败:', error);
    }
  }

  public lookAtNormalizedPoint(
    point: { x: number; y: number } | null,
    options?: { mirrored?: boolean; scaleX?: number; scaleY?: number }
  ): void {
    try {
      if (!point) {
        this.getManager().onDrag(0.0, 0.0);
        return;
      }

      const mirrored = options?.mirrored ?? true;
      const normalizedX = mirrored ? 1 - point.x : point.x;
      const dragX = this.clamp(
        (normalizedX - 0.5) * 2 * (options?.scaleX ?? 2.2)
      );
      const dragY = this.clamp(
        (0.5 - point.y) * 2 * (options?.scaleY ?? 1.5)
      );

      this.getManager().onDrag(dragX, dragY);
    } catch (error) {
      console.error('[AvatarService] 更新视线跟随失败:', error);
    }
  }

  public async playReplyAudio(url: string): Promise<void> {
    if (!url) return;
    this.stopAudio();
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`音频加载失败: ${response.status}`);
      }
      const audioManager = this.getManager().getAudioManager();
      await audioManager.loadAudioFromArrayBuffer(await response.arrayBuffer());
      audioManager.play();
    } catch (error) {
      console.error('[AvatarService] 播放回复语音失败:', error);
    }
  }

  public enqueueStreamingAudio(
    replyId: string,
    sequence: number,
    url: string
  ): void {
    if (!replyId || !url) return;
    if (this.streamingReplyId && this.streamingReplyId !== replyId) {
      this.stopAudio();
    }
    this.streamingReplyId = replyId;

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audio.src = url;
    audio.load();

    this.streamingQueue.push({ replyId, sequence, audio });
    this.streamingQueue.sort((left, right) => left.sequence - right.sequence);
    void this.processStreamingQueue();
  }

  private async processStreamingQueue(): Promise<void> {
    if (this.processingStreamingQueue) return;
    this.processingStreamingQueue = true;
    const generation = this.streamingGeneration;

    try {
      while (
        generation === this.streamingGeneration &&
        this.streamingQueue.length > 0
      ) {
        const item = this.streamingQueue.shift();
        if (!item || item.replyId !== this.streamingReplyId) continue;
        await this.getManager()
          .getAudioManager()
          .playStreamingAudio(item.audio);
      }
    } catch (error) {
      console.error('[AvatarService] 流式语音播放失败:', error);
    } finally {
      this.processingStreamingQueue = false;
      if (this.streamingQueue.length > 0) {
        void this.processStreamingQueue();
      }
    }
  }

  public stopAudio(): void {
    this.streamingGeneration++;
    this.streamingReplyId = '';
    this.streamingQueue.forEach(item => {
      item.audio.pause();
      item.audio.removeAttribute('src');
      item.audio.load();
    });
    this.streamingQueue = [];
    try {
      this.getManager().getAudioManager().stop();
    } catch (error) {
      console.error('[AvatarService] 停止语音失败:', error);
    }
  }

  private clamp(value: number): number {
    return Math.max(-1.0, Math.min(1.0, value));
  }
}

export const avatarService = new AvatarService();
