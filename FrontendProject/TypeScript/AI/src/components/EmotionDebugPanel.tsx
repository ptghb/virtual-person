import React, { useMemo, useState } from 'react';
import { Button, InputNumber, Space, Tag } from 'antd';
import { BugOutlined, ReloadOutlined } from '@ant-design/icons';
import { avatarService } from '../services/avatar.service';
import {
  EMOTION_LABEL_MAP,
  type CompanionEmotion,
  getExpressionForEmotion
} from '../emotion';

const EMOTION_MOTION_MAP: Record<string, Partial<Record<CompanionEmotion, number>>> = {
  Hiyori: { neutral: 0, happy: 1, shy: 1, sad: 7, worried: 7, wronged: 7, angry: 3, comforting: 7, playful: 1, sleepy: 7 },
  Haru: { neutral: 0, happy: 1, shy: 1, sad: 1, worried: 1, wronged: 1, angry: 2, comforting: 1, playful: 1, sleepy: 1 },
  Mark: { neutral: 0, happy: 3, shy: 3, sad: 3, worried: 3, wronged: 3, angry: 4, comforting: 3, playful: 3, sleepy: 3 },
  Natori: { neutral: 0, happy: 5, shy: 5, sad: 5, worried: 5, wronged: 5, angry: 6, comforting: 5, playful: 5, sleepy: 5 },
  Rice: { neutral: 0, happy: 2, shy: 2, sad: 1, worried: 1, wronged: 1, angry: 3, comforting: 1, playful: 2, sleepy: 1 },
  Mao: { neutral: 0, happy: 4, shy: 4, sad: 2, worried: 2, wronged: 2, angry: 3, comforting: 2, playful: 4, sleepy: 2 },
  Ren: { neutral: 0, happy: 1, shy: 1, sad: 0, worried: 0, wronged: 0, angry: 0, comforting: 0, playful: 1, sleepy: 0 },
  Wanko: { neutral: 0, happy: 1, shy: 1, sad: 2, worried: 2, wronged: 2, angry: 3, comforting: 2, playful: 1, sleepy: 2 }
};

const EMOTIONS = Object.keys(EMOTION_LABEL_MAP) as CompanionEmotion[];

function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debugEmotion') === 'true';
}

export const EmotionDebugPanel: React.FC = () => {
  const enabled = isDebugEnabled();
  const modelName = avatarService.getCurrentModelName();
  const [emotion, setEmotion] = useState<CompanionEmotion>('neutral');
  const [intensity, setIntensity] = useState(0.75);
  const [lastApplied, setLastApplied] = useState<CompanionEmotion>('neutral');

  const expression = useMemo(
    () => getExpressionForEmotion(modelName, emotion),
    [modelName, emotion]
  );
  const animationIndex = EMOTION_MOTION_MAP[modelName]?.[emotion] ?? 0;

  if (!enabled) return null;

  const applyEmotion = () => {
    const detail = {
      emotion,
      emotionLabel: EMOTION_LABEL_MAP[emotion],
      intensity,
      reason: '开发调试面板手动设置',
      expression
    };
    avatarService.setExpression(expression);
    avatarService.playMotion(animationIndex);
    window.dispatchEvent(new CustomEvent('companion-emotion', { detail }));
    window.dispatchEvent(
      new CustomEvent('change-animation', { detail: { animationIndex } })
    );
    setLastApplied(emotion);
  };

  const resetEmotion = () => {
    setEmotion('neutral');
    setIntensity(0);
    window.dispatchEvent(
      new CustomEvent('companion-emotion', {
        detail: {
          emotion: 'neutral',
          emotionLabel: EMOTION_LABEL_MAP.neutral,
          intensity: 0,
          reason: '开发调试面板重置',
          expression: getExpressionForEmotion(modelName, 'neutral')
        }
      })
    );
    avatarService.setExpression(getExpressionForEmotion(modelName, 'neutral'));
    avatarService.playMotion(EMOTION_MOTION_MAP[modelName]?.neutral ?? 0);
    setLastApplied('neutral');
  };

  return (
    <div className="emotion-debug-panel" aria-label="情绪调试面板">
      <div className="emotion-debug-panel__title">
        <span><BugOutlined /> 情绪调试</span>
        <Tag color="purple">{modelName}</Tag>
      </div>
      <Space wrap size="small">
        <select
          className="emotion-debug-panel__select"
          value={emotion}
          onChange={e => setEmotion(e.target.value as CompanionEmotion)}
          aria-label="情绪选择"
        >
          {EMOTIONS.map(item => (
            <option key={item} value={item}>
              {EMOTION_LABEL_MAP[item]}
            </option>
          ))}
        </select>
        <InputNumber
          min={0}
          max={1}
          step={0.05}
          value={intensity}
          onChange={value => setIntensity(Number(value ?? 0))}
          style={{ width: 92 }}
          aria-label="情绪强度"
        />
        <Button type="primary" onClick={applyEmotion}>应用</Button>
        <Button icon={<ReloadOutlined />} onClick={resetEmotion}>重置</Button>
      </Space>
      <div className="emotion-debug-panel__meta">
        <span>表情：{expression ?? '无映射'}</span>
        <span>动作：{animationIndex}</span>
        <span>当前：{EMOTION_LABEL_MAP[lastApplied]}</span>
      </div>
    </div>
  );
};
