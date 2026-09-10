import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, InputNumber, Space, Tag } from 'antd';
import { BugOutlined, ReloadOutlined, LineChartOutlined } from '@ant-design/icons';
import { avatarService } from '../services/avatar.service';
import { getBackendApiUrl } from '../config';
import {
  EMOTION_LABEL_MAP,
  normalizeCompanionEmotion,
  getExpressionForEmotion,
  type CompanionEmotion
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

/** 情绪颜色映射，与 CSS 中保持一致 */
const EMOTION_COLORS: Record<string, string> = {
  neutral: '#8c9bb8',
  happy: '#ff7ab6',
  shy: '#ff9ac9',
  sad: '#8c9bb8',
  worried: '#7aa7ff',
  wronged: '#8c9bb8',
  angry: '#ff6b6b',
  comforting: '#7aa7ff',
  playful: '#ff7ab6',
  sleepy: '#9b8cff'
};

interface EmotionHistoryItem {
  emotion: string;
  emotion_label: string;
  intensity: number;
  content: string;
  occurred_at: string;
}

function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debugEmotion') === 'true';
}

/** 情绪历史曲线图 — 纯 SVG 实现，不依赖额外图表库 */
const EmotionHistoryChart: React.FC<{ data: EmotionHistoryItem[] }> = ({ data }) => {
  const width = 320;
  const height = 80;
  const padding = 4;

  if (data.length === 0) {
    return <div className="emotion-debug-panel__no-history">暂无情绪历史记录</div>;
  }

  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  const points = data.map((item, i) => {
    const x = padding + i * stepX;
    const y = height - padding - item.intensity * (height - padding * 2);
    return { x, y, ...item };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="emotion-debug-panel__chart">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* 背景网格线 */}
        {[0.25, 0.5, 0.75].map(ratio => {
          const y = padding + ratio * (height - padding * 2);
          return <line key={ratio} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth={1} />;
        })}
        {/* 曲线 */}
        <path d={pathD} fill="none" stroke="#8c9bb8" strokeWidth={1.5} />
        {/* 数据点 */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={EMOTION_COLORS[p.emotion] || '#8c9bb8'} />
            <title>{`${p.emotion_label} (${(p.intensity * 100).toFixed(0)}%)`}</title>
          </g>
        ))}
      </svg>
      <div className="emotion-debug-panel__chart-legend">
        {data.slice(-6).map((item, i) => (
          <span key={i} className="emotion-debug-panel__chart-tag" style={{ color: EMOTION_COLORS[item.emotion] || '#8c9bb8' }}>
            {item.emotion_label}
          </span>
        ))}
      </div>
    </div>
  );
};

export const EmotionDebugPanel: React.FC = () => {
  const enabled = isDebugEnabled();
  const modelName = avatarService.getCurrentModelName();
  const [emotion, setEmotion] = useState<CompanionEmotion>('neutral');
  const [intensity, setIntensity] = useState(0.75);
  const [lastApplied, setLastApplied] = useState<CompanionEmotion>('neutral');
  const [history, setHistory] = useState<EmotionHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const sessionIdRef = useRef('debug-panel');

  const expression = useMemo(
    () => getExpressionForEmotion(modelName, emotion),
    [modelName, emotion]
  );
  const animationIndex = EMOTION_MOTION_MAP[modelName]?.[emotion] ?? 0;

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(getBackendApiUrl(`/api/debug/emotion/${sessionIdRef.current}/history?limit=20`));
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        setHistory(json.data);
      }
    } catch {
      // 静默失败，调试面板不应影响主流程
    }
  }, []);

  useEffect(() => {
    if (enabled && showHistory) {
      fetchHistory();
      const timer = setInterval(fetchHistory, 5000);
      return () => clearInterval(timer);
    }
  }, [enabled, showHistory, fetchHistory]);

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
    if (showHistory) {
      setTimeout(fetchHistory, 500);
    }
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
    if (showHistory) {
      setTimeout(fetchHistory, 500);
    }
  };

  return (
    <div className="emotion-debug-panel" aria-label="情绪调试面板">
      <div className="emotion-debug-panel__title">
        <span><BugOutlined /> 情绪调试</span>
        <Tag color="purple">{modelName}</Tag>
        <Button
          size="small"
          type={showHistory ? 'primary' : 'default'}
          ghost={showHistory}
          icon={<LineChartOutlined />}
          onClick={() => setShowHistory(!showHistory)}
        >
          曲线
        </Button>
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
      {showHistory && (
        <div className="emotion-debug-panel__history">
          <div className="emotion-debug-panel__history-title">
            情绪历史曲线（最近 {history.length} 条）
          </div>
          <EmotionHistoryChart data={history} />
        </div>
      )}
    </div>
  );
};
