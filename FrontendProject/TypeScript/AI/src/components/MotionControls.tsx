/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import React, { useState, useEffect } from 'react';
import { LAppDelegate } from '../lappdelegate';
import * as LAppDefine from '../lappdefine';

const MotionControls: React.FC = () => {
  const [toggleMotionText, setToggleMotionText] = useState<string>('循环播放随机动画');
  const [motionOptions, setMotionOptions] = useState<number[]>([0]);
  const [selectedMotionNo, setSelectedMotionNo] = useState<number>(0);

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

      // 更新按钮文本
      const model = live2DManager._models.at(0);
      if (model && model.isMotionEnabled()) {
        setToggleMotionText('停止循环播放动画');
      } else {
        setToggleMotionText('循环播放随机动画');
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

      // 更新按钮文本
      const model = live2DManager._models.at(0);
      if (model && model.isMotionEnabled()) {
        setToggleMotionText('停止循环播放动画');
      } else {
        setToggleMotionText('循环播放随机动画');
      }
    } catch (error) {
      console.error('Error playing motion by no:', error as Error);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button id="toggle-motion-no" style={{ width: '120px' }} onClick={handlePlayMotionByNo}>
          循环播放指定动画
        </button>
        <select
          id="motion-no-select"
          style={{ width: '120px' }}
          value={selectedMotionNo}
          onChange={e => setSelectedMotionNo(parseInt(e.target.value, 10))}
        >
          {motionOptions.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <button id="toggle-motion" onClick={handleToggleMotion}>
        {toggleMotionText}
      </button>
    </>
  );
};

export default MotionControls;
