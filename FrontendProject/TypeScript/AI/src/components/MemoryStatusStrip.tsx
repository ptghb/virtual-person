import React from 'react';
import { Tag, Tooltip } from 'antd';
import type { MemoryItem } from '../services/memory.types';

interface MemoryStatusStripProps {
  relationship: MemoryItem | null;
  followups: MemoryItem[];
  refreshing?: boolean;
}

function getRelationshipStage(item: MemoryItem) {
  const rawValue = item.normalized_json?.relationship_stage;
  return typeof rawValue === 'string' && rawValue.trim() ? rawValue : '陪伴';
}

function getRelationshipStageTone(stage: string) {
  switch (stage) {
    case '安慰':
      return { color: '#4f83ff', className: 'relationship-stage-tag--comfort' };
    case '升温':
      return { color: '#ff6b9f', className: 'relationship-stage-tag--warmth' };
    case '轻松闲聊':
      return { color: '#7a8a9a', className: 'relationship-stage-tag--casual' };
    case '陪伴':
    default:
      return { color: '#6fbd72', className: 'relationship-stage-tag--support' };
  }
}

function getRelationshipStageDescription(stage: string) {
  switch (stage) {
    case '安慰':
      return '这段时间更偏向安抚情绪、接住压力和低落。';
    case '升温':
      return '这段时间更偏向拉近距离，互动会更甜一点。';
    case '轻松闲聊':
      return '这段时间以轻松聊天为主，节奏更松弛。';
    case '陪伴':
    default:
      return '这段时间更偏向日常陪伴，稳定地接住你的生活节奏。';
  }
}

export const MemoryStatusStrip: React.FC<MemoryStatusStripProps> = ({
  relationship,
  refreshing = false
}) => {
  if (!relationship && !refreshing) {
    return null;
  }

  const stage = relationship ? getRelationshipStage(relationship) : '更新中';
  const tone = getRelationshipStageTone(stage);

  return (
    <div className="memory-status-strip memory-status-strip--relationship-only">
      <Tooltip
        title={
          relationship
            ? getRelationshipStageDescription(stage)
            : '正在更新关系状态...'
        }
      >
        <div className="memory-status-strip__relationship-state">
          <span>关系状态</span>
          <Tag color={tone.color} className={tone.className}>
            {stage}
          </Tag>
        </div>
      </Tooltip>
    </div>
  );
};
