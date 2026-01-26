/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import React, { useState, useRef } from 'react';
import { LAppDelegate } from '../lappdelegate';

const ZoomControls: React.FC = () => {
  const [zoomValue, setZoomValue] = useState<number>(50);
  const decreaseIntervalRef = useRef<number | null>(null);
  const increaseIntervalRef = useRef<number | null>(null);

  const adjustZoom = (delta: number): void => {
    try {
      const subdelegate = LAppDelegate.getInstance()._subdelegates.at(0);
      const view = subdelegate['_view'];
      const viewMatrix = view['_viewMatrix'];

      // 获取最小和最大缩放比例
      const minScale = viewMatrix.getMinScale();
      const maxScale = viewMatrix.getMaxScale();

      // 获取当前滑块值并调整
      let currentValue = zoomValue;
      currentValue = Math.max(0, Math.min(100, currentValue + delta));
      setZoomValue(currentValue);

      // 滑块值(0-100)映射到缩放比例
      const sliderValue = currentValue;
      const normalizedValue = sliderValue / 100; // 0 到 1

      // 使用对数缩放，使滑块移动更自然
      const logMin = Math.log(minScale);
      const logMax = Math.log(maxScale);
      const logMid = (logMin + logMax) / 2;

      // 计算目标缩放比例
      let targetScale: number;
      if (normalizedValue < 0.5) {
        const leftNormalized = normalizedValue * 2;
        targetScale = Math.exp(logMin + leftNormalized * (logMid - logMin));
      } else {
        const rightNormalized = (normalizedValue - 0.5) * 2;
        targetScale = Math.exp(logMid + rightNormalized * (logMax - logMid));
      }

      viewMatrix.scale(targetScale, targetScale);
    } catch (error) {
      console.error('Error adjusting zoom:', error as Error);
    }
  };

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    try {
      const subdelegate = LAppDelegate.getInstance()._subdelegates.at(0);
      const view = subdelegate['_view'];
      const viewMatrix = view['_viewMatrix'];

      const minScale = viewMatrix.getMinScale();
      const maxScale = viewMatrix.getMaxScale();

      const sliderValue = parseInt(event.target.value, 10);
      setZoomValue(sliderValue);

      const normalizedValue = sliderValue / 100;

      const logMin = Math.log(minScale);
      const logMax = Math.log(maxScale);
      const logMid = (logMin + logMax) / 2;

      let targetScale: number;
      if (normalizedValue < 0.5) {
        const leftNormalized = normalizedValue * 2;
        targetScale = Math.exp(logMin + leftNormalized * (logMid - logMin));
      } else {
        const rightNormalized = (normalizedValue - 0.5) * 2;
        targetScale = Math.exp(logMid + rightNormalized * (logMax - logMid));
      }

      viewMatrix.scale(targetScale, targetScale);
    } catch (error) {
      console.error('Error adjusting zoom:', error as Error);
    }
  };

  const startDecrease = (): void => {
    adjustZoom(-1); // 立即调整一次
    decreaseIntervalRef.current = window.setInterval(() => {
      adjustZoom(-1); // 每50ms调整一次
    }, 50);
  };

  const stopDecrease = (): void => {
    if (decreaseIntervalRef.current !== null) {
      clearInterval(decreaseIntervalRef.current);
      decreaseIntervalRef.current = null;
    }
  };

  const startIncrease = (): void => {
    adjustZoom(1); // 立即调整一次
    increaseIntervalRef.current = window.setInterval(() => {
      adjustZoom(1); // 每50ms调整一次
    }, 50);
  };

  const stopIncrease = (): void => {
    if (increaseIntervalRef.current !== null) {
      clearInterval(increaseIntervalRef.current);
      increaseIntervalRef.current = null;
    }
  };

  return (
    <div style={{ marginTop: '10px' }}>
      <label htmlFor="zoom-slider" style={{ fontSize: '14px', marginBottom: '5px', display: 'block' }}>
        镜头缩放:
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          id="zoom-decrease"
          style={{
            padding: '4px 6px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            minWidth: '20px',
          }}
          onMouseDown={startDecrease}
          onMouseUp={stopDecrease}
          onMouseLeave={stopDecrease}
          onTouchStart={e => {
            e.preventDefault();
            startDecrease();
          }}
          onTouchEnd={stopIncrease}
        >
          -
        </button>
        <input
          type="range"
          id="zoom-slider"
          min="0"
          max="100"
          value={zoomValue}
          onChange={handleSliderChange}
          style={{ flex: 1, cursor: 'pointer' }}
        />
        <button
          id="zoom-increase"
          style={{
            padding: '4px 6px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            minWidth: '20px',
          }}
          onMouseDown={startIncrease}
          onMouseUp={stopIncrease}
          onMouseLeave={stopIncrease}
          onTouchStart={e => {
            e.preventDefault();
            startIncrease();
          }}
          onTouchEnd={stopIncrease}
        >
          +
        </button>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#aaa',
          marginTop: '5px',
        }}
      >
        <span>镜头推远</span>
        <span>镜头拉近</span>
      </div>
    </div>
  );
};

export default ZoomControls;
