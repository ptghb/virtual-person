import React, { useEffect, useRef } from 'react';
import { avatarService } from '../services/avatar.service';
import { DigitalHumanStage } from '../components/DigitalHumanStage';
import { useCompanionProfile } from '../services/companion-profile.service';
import { ModelDir } from '../lappdefine';
import { useSelectedAvatarModel } from '../services/avatar-preference.service';
import { syncCompanionToServer } from '../services/companion-server.service';

export const DesktopPage: React.FC = () => {
  const { profile } = useCompanionProfile();
  const selectedAvatar = useSelectedAvatarModel();
  const dragRef = useRef<{
    pointerId: number;
    startScreenX: number;
    startScreenY: number;
    windowX: number;
    windowY: number;
  } | null>(null);

  useEffect(() => {
    // Electron 的无边框透明窗口不保证 document pointermove 能稳定到达，
    // 桌面模式直接按窗口坐标驱动 Live2D 视线。
    avatarService.setPointerFollowSuspended(true);
    const handleLookPointerMove = (event: PointerEvent): void => {
      avatarService.lookAtNormalizedPoint({
        x: event.clientX / Math.max(window.innerWidth, 1),
        y: event.clientY / Math.max(window.innerHeight, 1)
      }, {
        // 桌面鼠标坐标不是摄像头镜像坐标，不能再做水平翻转。
        mirrored: false
      });
    };
    const resetLookAt = (): void => avatarService.lookAtNormalizedPoint(null);
    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();
      // 使用相对倍率，ViewMatrix 内部会自动限制在最小/最大倍率范围。
      avatarService.zoom(event.deltaY < 0 ? 1.08 : 0.92);
    };
    const handlePointerDown = async (event: PointerEvent): Promise<void> => {
      const target = event.target as Element | null;
      if (
        event.button !== 0 ||
        !window.desktop ||
        dragRef.current ||
        target?.closest('.desktop-avatar-switcher')
      ) {
        return;
      }
      event.preventDefault();
      const [windowX, windowY] = await window.desktop.getPosition();
      // 如果用户在等待 IPC 返回期间已经松开鼠标，不启动拖动。
      if (event.buttons === 0) return;
      dragRef.current = {
        pointerId: event.pointerId,
        startScreenX: event.screenX,
        startScreenY: event.screenY,
        windowX,
        windowY
      };
      document.documentElement.setPointerCapture?.(event.pointerId);
    };
    const handlePointerMove = (event: PointerEvent): void => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId || !window.desktop) return;
      event.preventDefault();
      void window.desktop.moveWindow(
        drag.windowX + event.screenX - drag.startScreenX,
        drag.windowY + event.screenY - drag.startScreenY
      );
    };
    const stopDragging = (event: PointerEvent): void => {
      if (dragRef.current?.pointerId !== event.pointerId) return;
      document.documentElement.releasePointerCapture?.(event.pointerId);
      dragRef.current = null;
    };

    window.addEventListener('pointermove', handleLookPointerMove, true);
    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('pointerup', stopDragging, true);
    window.addEventListener('pointercancel', stopDragging, true);
    window.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    window.addEventListener('pointerleave', resetLookAt);
    window.addEventListener('blur', resetLookAt);
    return () => {
      window.removeEventListener('pointermove', handleLookPointerMove, true);
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('pointerup', stopDragging, true);
      window.removeEventListener('pointercancel', stopDragging, true);
      window.removeEventListener('wheel', handleWheel, true);
      window.removeEventListener('pointerleave', resetLookAt);
      window.removeEventListener('blur', resetLookAt);
      dragRef.current = null;
      avatarService.setPointerFollowSuspended(false);
    };
  }, []);

  useEffect(() => {
    void syncCompanionToServer({ companionId: selectedAvatar }).catch(error => {
      console.error('[DesktopPage] 同步服务端人物失败:', error);
    });
  }, [profile.name, profile.personality, selectedAvatar]);

  const switchAvatar = (direction: 1 | -1): void => {
    const currentIndex = ModelDir.indexOf(selectedAvatar);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextModel =
      ModelDir[(safeIndex + direction + ModelDir.length) % ModelDir.length];

    if (!avatarService.selectModel(nextModel)) {
      return;
    }
  };

  return (
    <main className="desktop-page">
      <DigitalHumanStage transparent subtitle={`${profile.name}正在陪着你`} />
      <div className="desktop-avatar-switcher" aria-label="切换桌面虚拟人物">
        <button
          type="button"
          onClick={() => switchAvatar(-1)}
          aria-label="上一个虚拟人物"
        >
          ‹
        </button>
        <span title="当前虚拟人物会作为服务端 companion_id">
          {selectedAvatar}
        </span>
        <button
          type="button"
          onClick={() => switchAvatar(1)}
          aria-label="下一个虚拟人物"
        >
          ›
        </button>
      </div>
    </main>
  );
};
