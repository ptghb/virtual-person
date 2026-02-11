/**
 * 手势控制组件
 * 提供手势识别界面和控制按钮
 * 新交互逻辑：当伸出食指时，屏幕出现一个小手，小手碰到Live2D模型时，随机播放一个动画
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Switch, message } from 'antd';
import { RiseOutlined, StopOutlined } from '@ant-design/icons';
import {
  HandGestureServiceInstance,
  FingerState,
  HandGesture
} from '../services/HandGestureService';
import { LAppDelegate } from '../lappdelegate';
import * as LAppDefine from '../lappdefine';

const HandGestureControls: React.FC = () => {
  const [isGestureSyncEnabled, setIsGestureSyncEnabled] =
    useState<boolean>(false);
  const [currentGesture, setCurrentGesture] = useState<HandGesture>({
    leftHand: null,
    rightHand: null,
    leftHandIndexPosition: null,
    rightHandIndexPosition: null
  });
  const [isServiceInitialized, setIsServiceInitialized] =
    useState<boolean>(false);
  const [cursorHandVisible, setCursorHandVisible] = useState<boolean>(false);
  const [cursorPosition, setCursorPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [isPlayingMotion, setIsPlayingMotion] = useState<boolean>(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // 初始化手势识别服务
    const initService = async () => {
      if (videoRef.current && canvasRef.current) {
        try {
          await HandGestureServiceInstance.initialize(
            videoRef.current,
            canvasRef.current
          );
          setIsServiceInitialized(true);
          message.success('手势识别服务初始化成功');
        } catch (error) {
          console.error('Failed to initialize hand gesture service:', error);
          message.error('手势识别服务初始化失败');
        }
      }
    };

    initService();

    // 注册手势回调
    const handleGesture = (gesture: HandGesture) => {
      setCurrentGesture(gesture);

      // 如果启用手势同步，则处理新的交互逻辑
      if (isGestureSyncEnabled) {
        handleNewInteractionLogic(gesture);
      }
    };

    HandGestureServiceInstance.onGesture(handleGesture);

    // 清理
    return () => {
      HandGestureServiceInstance.removeGestureCallback(handleGesture);
    };
  }, [isGestureSyncEnabled]);

  /**
   * 启用手势同步
   */
  const handleEnableGestureSync = async () => {
    if (!isServiceInitialized) {
      message.error('手势识别服务未初始化');
      return;
    }

    try {
      await HandGestureServiceInstance.start();
      setIsGestureSyncEnabled(true);
      setCursorHandVisible(false);
      message.success('手势同步已启用');
    } catch (error) {
      console.error('Failed to start gesture recognition:', error);
      message.error('启动手势识别失败');
    }
  };

  /**
   * 禁用手势同步
   */
  const handleDisableGestureSync = () => {
    HandGestureServiceInstance.stop();
    setIsGestureSyncEnabled(false);
    setCursorHandVisible(false);
    message.info('手势同步已禁用');
  };

  /**
   * 处理新的交互逻辑
   * 当伸出食指时，屏幕出现一个小手，小手碰到Live2D模型时，随机播放一个动画
   */
  const handleNewInteractionLogic = (gesture: HandGesture) => {
    // 检查是否有任意一只手伸出食指
    const hasIndexFingerExtended =
      (gesture.leftHand && gesture.leftHand.index) ||
      (gesture.rightHand && gesture.rightHand.index);

    if (hasIndexFingerExtended) {
      // 显示小手光标
      setCursorHandVisible(true);

      // 获取食指指尖位置（优先使用左手，如果没有则使用右手）
      let fingerPosition = null;
      if (gesture.leftHand?.index && gesture.leftHandIndexPosition) {
        fingerPosition = gesture.leftHandIndexPosition;
      } else if (gesture.rightHand?.index && gesture.rightHandIndexPosition) {
        fingerPosition = gesture.rightHandIndexPosition;
      }

      if (fingerPosition && videoContainerRef.current) {
        try {
          // 获取Live2D画布的位置和尺寸
          const subdelegate = LAppDelegate.getInstance()._subdelegates.at(0);
          const canvas = subdelegate.getCanvas();
          const canvasRect = canvas.getBoundingClientRect();

          // 获取视频容器的尺寸
          const videoWidth = videoContainerRef.current.clientWidth;
          const videoHeight = videoContainerRef.current.clientHeight;

          // 将视频画布的相对坐标（0-1）映射到Live2D画布的相对坐标
          // 注意：视频是镜像翻转的，所以X坐标需要反转
          const normalizedX = 1.0 - fingerPosition.x / videoWidth;
          const normalizedY = fingerPosition.y / videoHeight;

          // 将相对坐标转换为Live2D画布的屏幕坐标
          const screenX = canvasRect.left + normalizedX * canvasRect.width;
          const screenY = canvasRect.top + normalizedY * canvasRect.height;

          const screenPosition = { x: screenX, y: screenY };
          setCursorPosition(screenPosition);

          // 检测是否碰到Live2D模型
          checkCollisionAndPlayMotion(screenX, screenY);
        } catch (error) {
          console.error(
            'Failed to map finger position to Live2D canvas:',
            error
          );
        }
      }
    } else {
      // 隐藏小手光标
      setCursorHandVisible(false);
    }
  };

  /**
   * 检测碰撞并播放动画
   */
  const checkCollisionAndPlayMotion = (x: number, y: number) => {
    try {
      const live2DManager = LAppDelegate.getInstance()
        ._subdelegates.at(0)
        .getLive2DManager();
      const model = live2DManager._models.at(0);

      if (!model) {
        console.log('[HandGestureControls] Model not found');
        return;
      }

      // 检查是否正在播放动画
      if (isPlayingMotion) {
        return;
      }

      // 获取Live2D画布的位置和尺寸
      const subdelegate = LAppDelegate.getInstance()._subdelegates.at(0);
      const canvas = subdelegate.getCanvas();
      const rect = canvas.getBoundingClientRect();

      // 将屏幕坐标转换为画布坐标
      const canvasX = x - rect.left;
      const canvasY = y - rect.top;

      // 检查是否在画布范围内
      if (
        canvasX < 0 ||
        canvasX > rect.width ||
        canvasY < 0 ||
        canvasY > rect.height
      ) {
        return;
      }

      // 转换为Live2D视图坐标
      const view = subdelegate.getView();
      const viewX = view.transformViewX(canvasX * window.devicePixelRatio);
      const viewY = view.transformViewY(canvasY * window.devicePixelRatio);

      console.log(
        `[HandGestureControls] Checking collision at canvas(${canvasX.toFixed(2)}, ${canvasY.toFixed(2)}) -> view(${viewX.toFixed(2)}, ${viewY.toFixed(2)})`
      );

      // 检测是否碰到模型的任意碰撞区域
      const hitAreaCount = model._modelSetting.getHitAreasCount();
      console.log(`[HandGestureControls] Hit area count: ${hitAreaCount}`);

      let isHit = false;
      let hitAreaName = '';

      for (let i = 0; i < hitAreaCount; i++) {
        hitAreaName = model._modelSetting.getHitAreaName(i);
        const hitResult = model.hitTest(hitAreaName, viewX, viewY);
        console.log(
          `[HandGestureControls] Testing hit area '${hitAreaName}': ${hitResult}`
        );
        if (hitResult) {
          isHit = true;
          console.log(
            `[HandGestureControls] Hit detected on area: ${hitAreaName}`
          );
          break;
        }
      }

      // 如果碰到模型，播放随机动画
      if (isHit) {
        console.log(`[HandGestureControls] Playing random motion`);
        model.enableMotion();
      } else {
        console.log(`[HandGestureControls] No hit detected`);
        model.stopMotion();
      }
    } catch (error) {
      console.error(
        '[HandGestureControls] Failed to check collision or play motion:',
        error
      );
    }
  };

  /**
   * 播放随机动画
   */
  const playRandomMotion = (model: any) => {
    try {
      // 使用模型自带的随机动画播放方法，并传入动画完成回调
      model.startRandomMotion(
        LAppDefine.MotionGroupIdle,
        LAppDefine.PriorityIdle,
        // 动画播放完成时的回调函数
        () => {
          console.log('[HandGestureControls] Motion finished');
          setIsPlayingMotion(false);
        }
      );
    } catch (error) {
      console.error('Failed to play random motion:', error);
      setIsPlayingMotion(false);
    }
  };

  /**
   * 渲染手指状态显示（简化版）
   */
  const renderFingerState = (
    fingerState: FingerState | null,
    label: string
  ) => {
    if (!fingerState) {
      return <div style={{ color: '#999' }}>{label}: 未检测到</div>;
    }

    return (
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{label}:</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: fingerState.index ? '#52c41a' : '#ff4d4f' }}>
            食指: {fingerState.index ? '伸出' : '收起'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card title="手势控制" size="small" style={{ marginBottom: '10px' }}>
      <div style={{ marginBottom: '10px' }}>
        <Switch
          checked={isGestureSyncEnabled}
          onChange={checked => {
            if (checked) {
              handleEnableGestureSync();
            } else {
              handleDisableGestureSync();
            }
          }}
          disabled={!isServiceInitialized}
          checkedChildren="已启用"
          unCheckedChildren="已禁用"
        />
        <span style={{ marginLeft: '8px' }}>
          {isGestureSyncEnabled ? '手势同步已启用' : '手势同步已禁用'}
        </span>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <Button
          type="primary"
          icon={<RiseOutlined />}
          onClick={handleEnableGestureSync}
          disabled={!isServiceInitialized || isGestureSyncEnabled}
          block
          style={{ marginBottom: '8px' }}
        >
          启用手势同步
        </Button>
        <Button
          icon={<StopOutlined />}
          onClick={handleDisableGestureSync}
          disabled={!isGestureSyncEnabled}
          block
        >
          停止手势同步
        </Button>
      </div>

      {/* 视频和画布容器 */}
      <div style={{ marginBottom: '10px' }}>
        <div
          ref={videoContainerRef}
          style={{ position: 'relative', width: '100%', maxWidth: '320px' }}
        >
          <video
            ref={videoRef}
            style={{
              position: 'absolute',
              width: '100%',
              height: 'auto',
              transform: 'scaleX(-1)', // 镜像翻转
              opacity: isGestureSyncEnabled ? 1 : 0.3
            }}
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            width={320}
            height={240}
            style={{
              width: '100%',
              height: 'auto',
              transform: 'scaleX(-1)', // 镜像翻转
              opacity: isGestureSyncEnabled ? 1 : 0.3
            }}
          />
        </div>
      </div>

      {/* 手指状态显示 */}
      <div
        style={{
          marginTop: '10px',
          padding: '8px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px'
        }}
      >
        {renderFingerState(currentGesture.leftHand, '左手')}
        {renderFingerState(currentGesture.rightHand, '右手')}
      </div>

      {/* 使用说明 */}
      {isGestureSyncEnabled && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px',
            backgroundColor: '#e6f7ff',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#1890ff'
          }}
        >
          💡
          使用说明：伸出食指时，屏幕会出现小手光标。将小手移动到Live2D模型上，会随机播放一个动画。
        </div>
      )}

      {/* 小手光标 */}
      {cursorHandVisible && (
        <div
          style={{
            position: 'fixed',
            left: cursorPosition.x,
            top: cursorPosition.y,
            transform: 'translate(-50%, -50%)',
            fontSize: '40px',
            pointerEvents: 'none',
            zIndex: 9999,
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        >
          👋
        </div>
      )}

      {/* 添加脉冲动画样式 */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.8;
          }
        }
      `}</style>
    </Card>
  );
};

export default HandGestureControls;
