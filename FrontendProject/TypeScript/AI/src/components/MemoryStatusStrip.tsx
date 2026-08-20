import React, { useMemo, useState } from 'react';
import { Tag, Tooltip } from 'antd';
import { Link } from 'react-router-dom';
import type { MemoryItem } from '../services/memory.types';

interface MemoryStatusStripProps {
  relationship: MemoryItem | null;
  followups: MemoryItem[];
  refreshing?: boolean;
}

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function getTriggerExcerpt(item: MemoryItem) {
  const rawValue = item.normalized_json?.trigger_excerpt;
  return typeof rawValue === 'string' && rawValue.trim() ? rawValue : null;
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

function formatDueHint(ttlAt?: string | null) {
  if (!ttlAt) return '长期';
  const dueDate = new Date(ttlAt);
  if (Number.isNaN(dueDate.getTime())) return '临近到期';
  const diffHours = Math.ceil((dueDate.getTime() - Date.now()) / 3600000);
  if (diffHours <= 0) return '已到期';
  if (diffHours <= 24) return '今天到期';
  const diffDays = Math.ceil(diffHours / 24);
  return `${diffDays} 天后到期`;
}

function buildTooltipContent(item: MemoryItem, prefix: string) {
  return (
    <div className="memory-status-strip__tooltip">
      <strong>{prefix}</strong>
      <div>{item.content}</div>
      {getTriggerExcerpt(item) ? (
        <div className="memory-status-strip__tooltip-meta">
          触发片段：{getTriggerExcerpt(item)}
        </div>
      ) : null}
      {item.memory_type === 'followup' ? (
        <div className="memory-status-strip__tooltip-meta">
          {item.importance >= 4 ? '重点跟进' : '轻度跟进'}，{formatDueHint(item.ttl_at)}
        </div>
      ) : null}
        {item.memory_type === 'relationship' ? (
          <div className="memory-status-strip__tooltip-meta">
            当前阶段：{getRelationshipStage(item)}，{getRelationshipStageDescription(
              getRelationshipStage(item)
            )}
          </div>
        ) : null}
    </div>
  );
}

export const MemoryStatusStrip: React.FC<MemoryStatusStripProps> = ({
  relationship,
  followups,
  refreshing = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const visibleFollowups = useMemo(
    () => (expanded ? followups : followups.slice(0, 2)),
    [expanded, followups]
  );

  if (!relationship && followups.length === 0 && !refreshing) {
    return null;
  }

  return (
    <div className="memory-status-strip">
      <span className="memory-status-strip__label">她正在记着</span>
      {relationship ? (
          <Tooltip title={buildTooltipContent(relationship, '当前关系状态')}>
            <Link
              to={`/settings?highlight=${relationship.id}#memory-relationship`}
              className="memory-status-strip__chip"
            >
              关系：{truncate(relationship.content, 28)}
                <Tooltip title={getRelationshipStageDescription(getRelationshipStage(relationship))}>
                  <Tag
                    color={getRelationshipStageTone(getRelationshipStage(relationship)).color}
                    className={
                      getRelationshipStageTone(getRelationshipStage(relationship)).className
                    }
                  >
                    {getRelationshipStage(relationship)}
                  </Tag>
                </Tooltip>
            </Link>
          </Tooltip>
      ) : null}
      {visibleFollowups.map(item => (
          <Tooltip
            key={item.id}
            title={buildTooltipContent(item, '待跟进事项')}
          >
            <Link
              to={`/settings?highlight=${item.id}#memory-followups`}
              className="memory-status-strip__chip"
            >
              待跟进：{truncate(item.content.replace(/^后续可以跟进：/, ''), 18)}
              <Tag color={item.importance >= 4 ? 'volcano' : 'processing'}>
                {item.importance >= 4 ? '重点' : '轻度'}
              </Tag>
              <Tag>{formatDueHint(item.ttl_at)}</Tag>
            </Link>
          </Tooltip>
      ))}
      {followups.length > 2 ? (
        <button
          type="button"
          className="memory-status-strip__more"
          onClick={() => setExpanded(previous => !previous)}
        >
          {expanded ? '收起' : `还有 ${followups.length - 2} 条`}
        </button>
      ) : null}
      {refreshing ? (
        <span className="memory-status-strip__refreshing">正在更新记忆...</span>
      ) : null}
      <Link to="/settings#memory-followups" className="memory-status-strip__manage">
        管理记忆
      </Link>
    </div>
  );
};
