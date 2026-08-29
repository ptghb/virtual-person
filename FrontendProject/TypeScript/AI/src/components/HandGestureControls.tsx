import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, message } from 'antd';
import { CloseOutlined, HeartOutlined, LoadingOutlined } from '@ant-design/icons';
import {
  HandGesture,
  HandSide,
  TrackedHand,
  HandGestureServiceInstance
} from '../services/HandGestureService';
import { avatarService } from '../services/avatar.service';

interface ScreenHand {
  visible: boolean;
  x: number;
  y: number;
  touching: boolean;
}

const EMPTY_HAND: ScreenHand = {
  visible: false,
  x: 0,
  y: 0,
  touching: false
};

const smooth = (current: number, target: number): number =>
  current + (target - current) * 0.38;

/**
 * “摸摸我”交互层：打开摄像头，通过 MediaPipe 跟踪双手，并将左右手分别
 * 映射到虚拟人物舞台的左右区域。
 */
const HandGestureControls: React.FC = () => {
  const stageRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Record<HandSide, ScreenHand>>({
    left: { ...EMPTY_HAND },
    right: { ...EMPTY_HAND }
  });
  const contactRef = useRef<Record<HandSide, boolean>>({
    left: false,
    right: false
  });
  const lastTouchTimeRef = useRef(0);
  const [hands, setHands] = useState(handsRef.current);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stageElement, setStageElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const stage = document.querySelector<HTMLElement>('.digital-human-stage');
    stageRef.current = stage;
    setStageElement(stage);
  }, []);

  useEffect(() => {
    const removeCallback = HandGestureServiceInstance.onGesture(
      (gesture: HandGesture) => {
        const stage = stageRef.current;
        if (!stage) return;
        const stageRect = stage.getBoundingClientRect();

        const mapHand = (
          side: HandSide,
          trackedHand: TrackedHand | null
        ): ScreenHand => {
          if (!trackedHand) {
            contactRef.current[side] = false;
            return { ...EMPTY_HAND };
          }

          // 识别坐标来自未镜像画面，先镜像为用户看到的自拍方向。
          const mirroredX = 1 - trackedHand.position.x;
          // 左右手各使用舞台的一半，并保留中间重叠区域以便触碰人物。
          const targetX =
            side === 'left'
              ? 4 + mirroredX * 54
              : 42 + mirroredX * 54;
          const targetY = 8 + trackedHand.position.y * 84;
          const previous = handsRef.current[side];
          const x = previous.visible ? smooth(previous.x, targetX) : targetX;
          const y = previous.visible ? smooth(previous.y, targetY) : targetY;

          const clientX = stageRect.left + (x / 100) * stageRect.width;
          const clientY = stageRect.top + (y / 100) * stageRect.height;
          const touching = avatarService.hitTestClientPoint(clientX, clientY);
          const now = Date.now();

          if (
            touching &&
            !contactRef.current[side] &&
            now - lastTouchTimeRef.current > 1200
          ) {
            lastTouchTimeRef.current = now;
            avatarService.playRandomTouchMotion();
          }
          contactRef.current[side] = touching;

          return { visible: true, x, y, touching };
        };

        const nextHands = {
          left: mapHand('left', gesture.leftHand),
          right: mapHand('right', gesture.rightHand)
        };
        handsRef.current = nextHands;
        setHands(nextHands);
      }
    );

    return () => {
      removeCallback();
      HandGestureServiceInstance.dispose();
    };
  }, []);

  const start = async (): Promise<void> => {
    if (!videoRef.current || !canvasRef.current) return;
    setStarting(true);
    try {
      await HandGestureServiceInstance.initialize(
        videoRef.current,
        canvasRef.current
      );
      await HandGestureServiceInstance.start();
      setActive(true);
      message.success('摄像头已开启，把手伸到镜头前摸摸她吧');
    } catch (error) {
      console.error('[HandGestureControls] 摄像头启动失败:', error);
      message.error('无法打开摄像头，请检查浏览器摄像头权限');
    } finally {
      setStarting(false);
    }
  };

  const stop = (): void => {
    HandGestureServiceInstance.stop();
    handsRef.current = {
      left: { ...EMPTY_HAND },
      right: { ...EMPTY_HAND }
    };
    contactRef.current = { left: false, right: false };
    setHands(handsRef.current);
    setActive(false);
  };

  const renderHand = (side: HandSide, hand: ScreenHand) => {
    if (!active || !hand.visible) return null;
    return (
      <div
        className={`pet-hand pet-hand--${side} ${
          hand.touching ? 'is-touching' : ''
        }`}
        style={{ left: `${hand.x}%`, top: `${hand.y}%` }}
        aria-label={side === 'left' ? '检测到左手' : '检测到右手'}
      >
        <span className="pet-hand__emoji">🖐🏻</span>
        <small>{side === 'left' ? '左手' : '右手'}</small>
      </div>
    );
  };

  const overlay = stageElement
    ? createPortal(
        <div className="pet-me-layer">
          <div className={`pet-camera-preview ${active ? 'is-active' : ''}`}>
            <video ref={videoRef} playsInline muted />
            <canvas ref={canvasRef} width={640} height={480} />
            <span>MediaPipe 双手识别中</span>
          </div>

          {renderHand('left', hands.left)}
          {renderHand('right', hands.right)}
        </div>,
        stageElement
      )
    : null;

  return (
    <>
      {!active ? (
        <Button
          className="pet-me-button"
          icon={starting ? <LoadingOutlined /> : <HeartOutlined />}
          disabled={starting || !stageElement}
          onClick={() => void start()}
        >
          {starting ? '正在开启…' : '摸摸我'}
        </Button>
      ) : (
        <Button
          className="pet-me-button"
          icon={<CloseOutlined />}
          onClick={stop}
        >
          结束摸摸
        </Button>
      )}
      {overlay}
    </>
  );
};

export default HandGestureControls;
