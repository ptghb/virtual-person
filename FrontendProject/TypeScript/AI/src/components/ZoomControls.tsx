/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import React, { useState, useRef } from 'react';
import { LAppDelegate } from '../lappdelegate';
import { Button, Slider, Card, Typography } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';

const { Text } = Typography;

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

  const handleSliderChange = (value: number): void => {
    try {
      const subdelegate = LAppDelegate.getInstance()._subdelegates.at(0);
      const view = subdelegate['_view'];
      const viewMatrix = view['_viewMatrix'];

      const minScale = viewMatrix.getMinScale();
      const maxScale = viewMatrix.getMaxScale();

      const sliderValue = value;
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
    <Card title="镜头控制" size="small">
      <div style={{ marginBottom: '10px' }}>
        <Text type="secondary">镜头缩放:</Text>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Button
          icon={<ZoomOutOutlined />}
          onMouseDown={startDecrease}
          onMouseUp={stopDecrease}
          onMouseLeave={stopDecrease}
          onTouchStart={e => {
            e.preventDefault();
            startDecrease();
          }}
          onTouchEnd={stopDecrease}
        />
        <Slider
          min={0}
          max={100}
          value={zoomValue}
          onChange={handleSliderChange}
          style={{ flex: 1 }}
        />
        <Button
          icon={<ZoomInOutlined />}
          onMouseDown={startIncrease}
          onMouseUp={stopIncrease}
          onMouseLeave={stopIncrease}
          onTouchStart={e => {
            e.preventDefault();
            startIncrease();
          }}
          onTouchEnd={stopIncrease}
        />
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
        <Text type="secondary">镜头推远</Text>
        <Text type="secondary">镜头拉近</Text>
      </div>
    </Card>
  );
};

export default ZoomControls;
