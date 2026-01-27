/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import React, { useState, useEffect } from 'react';
import { LAppDelegate } from '../lappdelegate';
import * as LAppDefine from '../lappdefine';
import { Button, Select, Card } from 'antd';
import { PlayCircleOutlined, StopOutlined } from '@ant-design/icons';
import type { SelectProps } from 'antd';

const { Option } = Select;

const MotionControls: React.FC = () => {
  const [toggleMotionText, setToggleMotionText] = useState<string>('循环播放随机动画');
  const [motionOptions, setMotionOptions] = useState<number[]>([0]);
  const [selectedMotionNo, setSelectedMotionNo] = useState<number>(0);
  const [isMotionEnabled, setIsMotionEnabled] = useState<boolean>(false);

  useEffect(() => {
    // 初始化选择框选项 - 等待模型初始化完成
    const initMotionSelect = () => {
      try {
        const live2DManager = LAppDelegate.getInstance()
          ._subdelegates.at(0)
          .getLive2DManager();
        const model = live2DManager._models.at(0);

        if (model && model.isInitialized()) {
          // 获取Idle组的动画数量
          const motionCount = model._modelSetting.getMotionCount(
            LAppDefine.MotionGroupIdle
          );

          // 生成从0开始的选项数组
          const options = Array.from({ length: motionCount }, (_, i) => i);
          setMotionOptions(options);
        } else {
          // 如果模型还未初始化完成，延迟100ms后重试
          setTimeout(initMotionSelect, 100);
        }
      } catch (error) {
        console.error('Error initializing motion select:', error as Error);
      }
    };

    // 开始初始化
    initMotionSelect();
  }, []);

  const handleToggleMotion = () => {
    try {
      const live2DManager = LAppDelegate.getInstance()
        ._subdelegates.at(0)
        .getLive2DManager();

      live2DManager.toggleMotion();

      // 更新按钮文本和状态
      const model = live2DManager._models.at(0);
      if (model && model.isMotionEnabled()) {
        setToggleMotionText('停止循环播放动画');
        setIsMotionEnabled(true);
      } else {
        setToggleMotionText('循环播放随机动画');
        setIsMotionEnabled(false);
      }
    } catch (error) {
      console.error('Error toggling motion:', error as Error);
    }
  };

  const handlePlayMotionByNo = () => {
    try {
      const live2DManager = LAppDelegate.getInstance()
        ._subdelegates.at(0)
        .getLive2DManager();

      live2DManager.playMotionByNo(selectedMotionNo);

      // 更新按钮文本和状态
      const model = live2DManager._models.at(0);
      if (model && model.isMotionEnabled()) {
        setToggleMotionText('停止循环播放动画');
        setIsMotionEnabled(true);
      } else {
        setToggleMotionText('循环播放随机动画');
        setIsMotionEnabled(false);
      }
    } catch (error) {
      console.error('Error playing motion by no:', error as Error);
    }
  };

  return (
    <Card title="动画控制" size="small" style={{ marginBottom: '10px' }}>
      <div style={{ marginBottom: '10px' }}>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handlePlayMotionByNo}
          block
        >
          播放指定动画
        </Button>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <Select
          value={selectedMotionNo}
          onChange={(value) => setSelectedMotionNo(value as number)}
          style={{ width: '100%' }}
        >
          {motionOptions.map(option => (
            <Option key={option} value={option}>
              动画 {option}
            </Option>
          ))}
        </Select>
      </div>
      <Button
        type={isMotionEnabled ? 'default' : 'primary'}
        icon={isMotionEnabled ? <StopOutlined /> : <PlayCircleOutlined />}
        onClick={handleToggleMotion}
        block
      >
        {toggleMotionText}
      </Button>
    </Card>
  );
};

export default MotionControls;
