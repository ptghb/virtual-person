import { LAppDelegate } from '../lappdelegate';

class AvatarService {
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

  public playMotion(index: number): void {
    try {
      this.getManager().playMotionByNo(index);
    } catch (error) {
      console.error('[AvatarService] 播放动作失败:', error);
    }
  }

  public async playReplyAudio(url: string): Promise<void> {
    if (!url) return;
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

  public stopAudio(): void {
    try {
      this.getManager().getAudioManager().stop();
    } catch (error) {
      console.error('[AvatarService] 停止语音失败:', error);
    }
  }
}

export const avatarService = new AvatarService();
