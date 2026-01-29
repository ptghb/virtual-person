/**
 * 手势控制组件
 * 提供手势识别界面和控制按钮
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Switch, message } from 'antd';
import { RiseOutlined, StopOutlined } from '@ant-design/icons';
import { handGestureService, FingerState, HandGesture } from '../services/HandGestureService';
import { LAppDelegate } from '../lappdelegate';

const HandGestureControls: React.FC = () => {
  const [isGestureSyncEnabled, setIsGestureSyncEnabled] = useState<boolean>(false);
  const [currentGesture, setCurrentGesture] = useState<HandGesture>({
    leftHand: null,
    rightHand: null
  });
  const [isServiceInitialized, setIsServiceInitialized] = useState<boolean>(false);
  const [modelSupportsFingers, setModelSupportsFingers] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // 初始化手势识别服务
    const initService = async () => {
      if (videoRef.current && canvasRef.current) {
        try {
          await handGestureService.initialize(
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

      // 如果启用手势同步，则控制 Live2D 模型
      if (isGestureSyncEnabled) {
        syncLive2DModelWithGesture(gesture);
      }
    };

    handGestureService.onGesture(handleGesture);

    // 清理
    return () => {
      handGestureService.removeGestureCallback(handleGesture);
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
      await handGestureService.start();
      setIsGestureSyncEnabled(true);
      message.success('手势同步已启用');

      // 初始状态：双手张开
      setLive2DHandsOpen();
    } catch (error) {
      console.error('Failed to start gesture recognition:', error);
      message.error('启动手势识别失败');
    }
  };

  /**
   * 禁用手势同步
   */
  const handleDisableGestureSync = () => {
    handGestureService.stop();
    setIsGestureSyncEnabled(false);

    // 重置手臂状态
    try {
      const live2DManager = LAppDelegate.getInstance()
        ._subdelegates.at(0)
        .getLive2DManager();
      const model = live2DManager._models.at(0);
      if (model) {
        model.setArmState({ leftRaised: false, rightRaised: false });
      }
    } catch (error) {
      console.error('Failed to reset arm state:', error);
    }

    message.info('手势同步已禁用');
  };

  /**
   * 设置 Live2D 模型双手张开
   */
  const setLive2DHandsOpen = () => {
    try {
      const live2DManager = LAppDelegate.getInstance()
        ._subdelegates.at(0)
        .getLive2DManager();
      const model = live2DManager._models.at(0);

      if (!model) return;

      // 检查模型是否支持手指参数
      const supportsFingers = checkModelFingerSupport(model);
      setModelSupportsFingers(supportsFingers);

      if (supportsFingers && typeof model.setFingerState === 'function') {
        // 设置所有手指为伸出状态
        const fingerState: FingerState = {
          thumb: true,
          index: true,
          middle: true,
          ring: true,
          little: true
        };

        model.setFingerState('left', fingerState);
        model.setFingerState('right', fingerState);
      } else {
        // 如果模型不支持手指参数，设置初始手臂状态为抬起
        model.setArmState({ leftRaised: true, rightRaised: true });
      }
    } catch (error) {
      console.error('Failed to set Live2D hands open:', error);
    }
  };

  /**
   * 将手势同步到 Live2D 模型
   */
  const syncLive2DModelWithGesture = (gesture: HandGesture) => {
    try {
      const live2DManager = LAppDelegate.getInstance()
        ._subdelegates.at(0)
        .getLive2DManager();
      const model = live2DManager._models.at(0);

      if (!model) return;

      if (modelSupportsFingers && typeof model.setFingerState === 'function') {
        // 同步左手
        if (gesture.leftHand) {
          model.setFingerState('left', gesture.leftHand);
        }

        // 同步右手
        if (gesture.rightHand) {
          model.setFingerState('right', gesture.rightHand);
        }
      } else {
        // 如果模型不支持手指参数，根据手势状态控制手臂
        const leftArmRaised = gesture.leftHand && (gesture.leftHand.index || gesture.leftHand.middle);
        const rightArmRaised = gesture.rightHand && (gesture.rightHand.index || gesture.rightHand.middle);

        // 更新手臂状态
        model.setArmState({ leftRaised: leftArmRaised, rightRaised: rightArmRaised });
      }
    } catch (error) {
      console.error('Failed to sync Live2D model with gesture:', error);
    }
  };

  /**
   * 检查模型是否支持手指参数
   */
  const checkModelFingerSupport = (model: any): boolean => {
    try {
      // 尝试获取一个手指参数 ID
      const paramId = model._model.getParameterId('ParamHandLeftThumb1');
      return paramId !== null;
    } catch (error) {
      return false;
    }
  };

  /**
   * 渲染手指状态显示
   */
  const renderFingerState = (fingerState: FingerState | null, label: string) => {
    if (!fingerState) {
      return <div style={{ color: '#999' }}>{label}: 未检测到</div>;
    }

    return (
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{label}:</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: fingerState.thumb ? '#52c41a' : '#ff4d4f' }}>
            拇指: {fingerState.thumb ? '伸出' : '收起'}
          </span>
          <span style={{ color: fingerState.index ? '#52c41a' : '#ff4d4f' }}>
            食指: {fingerState.index ? '伸出' : '收起'}
          </span>
          <span style={{ color: fingerState.middle ? '#52c41a' : '#ff4d4f' }}>
            中指: {fingerState.middle ? '伸出' : '收起'}
          </span>
          <span style={{ color: fingerState.ring ? '#52c41a' : '#ff4d4f' }}>
            无名指: {fingerState.ring ? '伸出' : '收起'}
          </span>
          <span style={{ color: fingerState.little ? '#52c41a' : '#ff4d4f' }}>
            小指: {fingerState.little ? '伸出' : '收起'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card
      title="手势控制"
      size="small"
      style={{ marginBottom: '10px' }}
    >
      <div style={{ marginBottom: '10px' }}>
        <Switch
          checked={isGestureSyncEnabled}
          onChange={(checked) => {
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
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
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
      <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        {renderFingerState(currentGesture.leftHand, '左手')}
        {renderFingerState(currentGesture.rightHand, '右手')}
      </div>

      {/* 模型支持提示 */}
      {isGestureSyncEnabled && !modelSupportsFingers && (
        <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#fff7e6', borderRadius: '4px', fontSize: '12px', color: '#fa8c16' }}>
          ⚠️ 当前模型不支持手指参数控制，已启用手臂控制作为替代方案。
          <br />
          如需完整的手指控制功能，请使用支持手指参数的 Live2D 模型。
        </div>
      )}
    </Card>
  );
};

export default HandGestureControls;
