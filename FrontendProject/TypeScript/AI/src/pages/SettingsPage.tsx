import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Button,
  Card,
  Input,
  List,
  Popconfirm,
  Tag,
  Tooltip,
  message,
  Modal,
  Space,
  Switch
} from 'antd';
import {
  ArrowLeftOutlined,
  RightOutlined,
  UserSwitchOutlined
} from '@ant-design/icons';
import { useCompanionProfile } from '../services/companion-profile.service';
import { ModelDir } from '../lappdefine';
import { avatarService } from '../services/avatar.service';
import { getSelectedAvatarModel } from '../services/avatar-preference.service';
import { memoryService } from '../services/memory.service';
import type { MemoryItem } from '../services/memory.types';
import { useUserIdentity } from '../services/user-identity.service';

interface AvatarLivePreviewProps {
  active: boolean;
  modelName: string;
}

const AvatarLivePreview: React.FC<AvatarLivePreviewProps> = ({
  active,
  modelName
}) => {
  const previewRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!active) return;

    const preview = previewRef.current;
    const canvas = document.querySelector<HTMLCanvasElement>('.live2d-canvas');
    if (!preview || !canvas) return;

    const originalParent = canvas.parentNode;
    const originalNextSibling = canvas.nextSibling;
    const originalStyle = canvas.getAttribute('style');

    preview.appendChild(canvas);
    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: '1',
      borderRadius: 'inherit',
      boxShadow: 'none',
      pointerEvents: 'none'
    });

    const resizeFrame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      if (originalParent) {
        originalParent.insertBefore(canvas, originalNextSibling);
      }
      if (originalStyle === null) {
        canvas.removeAttribute('style');
      } else {
        canvas.setAttribute('style', originalStyle);
      }
      window.dispatchEvent(new Event('resize'));
    };
  }, [active]);

  return (
    <div className="avatar-live-preview">
      <div className="avatar-live-preview__canvas" ref={previewRef} />
      <div className="avatar-live-preview__name">{modelName}</div>
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const { profile, setCompanionProfile, resetCompanionProfile } =
    useCompanionProfile();
  const location = useLocation();
  const { identity } = useUserIdentity();
  const [name, setName] = useState(profile.name);
  const [personality, setPersonality] = useState(profile.personality);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(
    getSelectedAvatarModel()
  );
  const [confirmedAvatar, setConfirmedAvatar] = useState(
    getSelectedAvatarModel()
  );
  const [pinnedMemories, setPinnedMemories] = useState<MemoryItem[]>([]);
  const [autoMemories, setAutoMemories] = useState<MemoryItem[]>([]);
  const [archivedFollowups, setArchivedFollowups] = useState<MemoryItem[]>([]);
  const [relationshipHistory, setRelationshipHistory] = useState<MemoryItem[]>([]);
  const [memoryDraft, setMemoryDraft] = useState('');
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryType, setEditingMemoryType] = useState<
    MemoryItem['memory_type'] | null
  >(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memorySaving, setMemorySaving] = useState(false);
  const highlightedMemoryId =
    new URLSearchParams(location.search).get('highlight') || null;
  const [activeHighlightedId, setActiveHighlightedId] = useState<string | null>(
    highlightedMemoryId
  );

  useEffect(() => {
    setName(profile.name);
    setPersonality(profile.personality);
  }, [profile]);

  useEffect(() => {
    let active = true;
    const loadMemories = async () => {
      setMemoryLoading(true);
      try {
          const [
            pinnedResult,
            allResult,
            archivedFollowupResult,
            relationshipHistoryResult
          ] = await Promise.all([
          memoryService.listMemories(identity.userId, confirmedAvatar, 'pinned'),
            memoryService.listMemories(identity.userId, confirmedAvatar),
            memoryService.listMemories(
              identity.userId,
              confirmedAvatar,
              'followup',
              'archived'
            ),
            memoryService.listMemories(
              identity.userId,
              confirmedAvatar,
              'relationship',
              'superseded'
            )
        ]);
        if (active) {
          setPinnedMemories(pinnedResult.items);
          setAutoMemories(
            allResult.items.filter(item => item.memory_type !== 'pinned')
          );
            setArchivedFollowups(archivedFollowupResult.items);
            setRelationshipHistory(relationshipHistoryResult.items);
        }
      } catch (error) {
        if (active) {
          void message.error(
            error instanceof Error ? error.message : '读取置顶记忆失败'
          );
        }
      } finally {
        if (active) {
          setMemoryLoading(false);
        }
      }
    };

    void loadMemories();

    return () => {
      active = false;
    };
  }, [confirmedAvatar, identity.userId]);

  const reloadMemories = async () => {
    const [
      pinnedResult,
      allResult,
      archivedFollowupResult,
      relationshipHistoryResult
    ] = await Promise.all([
      memoryService.listMemories(identity.userId, confirmedAvatar, 'pinned'),
      memoryService.listMemories(identity.userId, confirmedAvatar),
      memoryService.listMemories(
        identity.userId,
        confirmedAvatar,
        'followup',
        'archived'
      ),
      memoryService.listMemories(
        identity.userId,
        confirmedAvatar,
        'relationship',
        'superseded'
      )
    ]);
    setPinnedMemories(pinnedResult.items);
    setAutoMemories(allResult.items.filter(item => item.memory_type !== 'pinned'));
    setArchivedFollowups(archivedFollowupResult.items);
    setRelationshipHistory(relationshipHistoryResult.items);
  };

  useEffect(() => {
    if (!location.hash) return;
    const element = document.getElementById(location.hash.slice(1));
    if (!element) return;
    window.setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, [location.hash]);

  useEffect(() => {
    setActiveHighlightedId(highlightedMemoryId);
    if (!highlightedMemoryId) return;
    const timer = window.setTimeout(() => {
      setActiveHighlightedId(current =>
        current === highlightedMemoryId ? null : current
      );
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [highlightedMemoryId]);

  useEffect(() => {
    if (!highlightedMemoryId) return;
    const element = document.getElementById(`memory-item-${highlightedMemoryId}`);
    if (!element) return;
    window.setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  }, [
    highlightedMemoryId,
    pinnedMemories,
    autoMemories,
    archivedFollowups,
    relationshipHistory
  ]);

  const saveProfile = () => {
    setCompanionProfile({ name, personality });
    void message.success('角色设定已保存');
  };

  const resetProfile = () => {
    resetCompanionProfile();
    void message.success('已恢复默认角色设定');
  };

  const openAvatarModal = () => {
    const current = getSelectedAvatarModel();
    setConfirmedAvatar(current);
    setSelectedAvatar(current);
    setAvatarModalOpen(true);
  };

  const previewAvatar = (modelName: string) => {
    if (avatarService.previewModel(modelName)) {
      setSelectedAvatar(modelName);
    }
  };

  const cancelAvatarSelection = () => {
    avatarService.previewModel(confirmedAvatar);
    setSelectedAvatar(confirmedAvatar);
    setAvatarModalOpen(false);
  };

  const confirmAvatarSelection = () => {
    if (!avatarService.selectModel(selectedAvatar)) {
      void message.error('虚拟人物切换失败，请稍后再试');
      return;
    }
    setConfirmedAvatar(selectedAvatar);
    setAvatarModalOpen(false);
    void message.success(`已选择 ${selectedAvatar}`);
  };

  const resetMemoryEditor = () => {
    setEditingMemoryId(null);
    setEditingMemoryType(null);
    setMemoryDraft('');
  };

  const submitPinnedMemory = async () => {
    const content = memoryDraft.trim();
    if (!content) return;
    setMemorySaving(true);
    try {
      if (editingMemoryId) {
        await memoryService.updateMemory(editingMemoryId, { content });
        void message.success(
          editingMemoryType === 'pinned' ? '置顶记忆已更新' : '记忆已更新'
        );
      } else {
        await memoryService.createMemory({
          user_id: identity.userId,
          session_id: identity.sessionId,
          companion_id: confirmedAvatar,
          memory_type: 'pinned',
          content,
          importance: 5
        });
        void message.success('置顶记忆已保存');
      }
      await reloadMemories();
      resetMemoryEditor();
    } catch (error) {
      void message.error(
        error instanceof Error ? error.message : '保存置顶记忆失败'
      );
    } finally {
      setMemorySaving(false);
    }
  };

  const startEditMemory = (item: MemoryItem) => {
    setEditingMemoryId(item.id);
    setEditingMemoryType(item.memory_type);
    setMemoryDraft(item.content);
  };

  const removeMemory = async (memoryId: string) => {
    try {
      await memoryService.deleteMemory(memoryId);
      setPinnedMemories(previous => previous.filter(item => item.id !== memoryId));
      setAutoMemories(previous => previous.filter(item => item.id !== memoryId));
      setArchivedFollowups(previous => previous.filter(item => item.id !== memoryId));
      setRelationshipHistory(previous => previous.filter(item => item.id !== memoryId));
      if (editingMemoryId === memoryId) {
        resetMemoryEditor();
      }
      void message.success('记忆已删除');
    } catch (error) {
      void message.error(
        error instanceof Error ? error.message : '删除记忆失败'
      );
    }
  };

  const updateMemoryStatus = async (
    memoryId: string,
    status: 'archived' | 'active',
    successText: string
  ) => {
    try {
      await memoryService.updateMemory(memoryId, { status });
      await reloadMemories();
      if (editingMemoryId === memoryId) {
        resetMemoryEditor();
      }
      void message.success(successText);
    } catch (error) {
      void message.error(
        error instanceof Error ? error.message : '更新记忆状态失败'
      );
    }
  };

  const memoryTypeLabel: Record<string, string> = {
    fact: '事实',
    preference: '偏好',
    boundary: '边界',
    summary: '摘要',
    pinned: '置顶',
    event: '事件',
    followup: '待跟进',
    relationship: '关系'
  };

  const sourceTypeLabel: Record<string, string> = {
    manual: '手动添加',
    chat: '聊天抽取',
    system: '系统生成',
    image: '图片分析',
    audio: '语音转写'
  };

  const formatTimestamp = (value?: string) => {
    if (!value) return '未知';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDueDate = (value?: string | null) => {
    if (!value) return '无到期时间';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDueHint = (value?: string | null) => {
    if (!value) return '长期保留';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const diffHours = Math.ceil((date.getTime() - Date.now()) / 3600000);
    if (diffHours <= 0) return '已到期';
    if (diffHours <= 24) return '今天到期';
    const diffDays = Math.ceil(diffHours / 24);
    return `${diffDays} 天后到期`;
  };

  const getFollowupPriorityLabel = (importance: number) => {
    if (importance >= 4) return { text: '重点', color: 'volcano' as const };
    return { text: '轻度', color: 'processing' as const };
  };

  const getTriggerExcerpt = (item: MemoryItem) => {
    const rawValue = item.normalized_json?.trigger_excerpt;
    return typeof rawValue === 'string' && rawValue.trim() ? rawValue : null;
  };

  const getRelationshipStage = (item: MemoryItem) => {
    const rawValue = item.normalized_json?.relationship_stage;
    return typeof rawValue === 'string' && rawValue.trim() ? rawValue : '陪伴';
  };

  const getRelationshipStageTone = (stage: string) => {
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
  };

  const getRelationshipStageDescription = (stage: string) => {
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
  };

  const relationshipMemory =
    autoMemories.find(item => item.memory_type === 'relationship') ?? null;
  const followupMemories = autoMemories.filter(
    item => item.memory_type === 'followup'
  );
  const generalAutoMemories = autoMemories.filter(
    item =>
      item.memory_type !== 'relationship' && item.memory_type !== 'followup'
  );
  const relationshipStageItems = [
    ...(relationshipMemory ? [relationshipMemory] : []),
    ...relationshipHistory
  ];
  const recentRelationshipStageItems = relationshipStageItems.filter(item => {
    const timestamp = new Date(item.updated_at);
    if (Number.isNaN(timestamp.getTime())) return false;
    return Date.now() - timestamp.getTime() <= 7 * 24 * 60 * 60 * 1000;
  });
  const relationshipStageStats = relationshipStageItems.reduce<
    Record<string, number>
  >((accumulator, item) => {
    const stage = getRelationshipStage(item);
    accumulator[stage] = (accumulator[stage] || 0) + 1;
    return accumulator;
  }, {});
  const recentRelationshipStageStats = recentRelationshipStageItems.reduce<
    Record<string, number>
  >((accumulator, item) => {
    const stage = getRelationshipStage(item);
    accumulator[stage] = (accumulator[stage] || 0) + 1;
    return accumulator;
  }, {});
  const topRelationshipStage =
    Object.entries(relationshipStageStats).sort((left, right) => right[1] - left[1])[0] ??
    null;
  const recentTopRelationshipStage =
    Object.entries(recentRelationshipStageStats).sort(
      (left, right) => right[1] - left[1]
    )[0] ?? null;
  const relationshipStageTotalCount = Object.values(relationshipStageStats).reduce(
    (sum, count) => sum + count,
    0
  );
  const recentRelationshipStageTotalCount = Object.values(
    recentRelationshipStageStats
  ).reduce((sum, count) => sum + count, 0);
  const sortedRelationshipStages = Object.entries(relationshipStageStats).sort(
    (left, right) => right[1] - left[1]
  );
  const sortedRecentRelationshipStages = Object.entries(
    recentRelationshipStageStats
  ).sort((left, right) => right[1] - left[1]);
  const recentRelationshipStageKinds = Object.keys(recentRelationshipStageStats).length;
  const currentRelationshipStage = relationshipMemory
    ? getRelationshipStage(relationshipMemory)
    : '未形成';
  const relationshipTrendHint = (() => {
    if (!recentTopRelationshipStage) {
      return '最近 7 天还没有形成明显的新趋势。';
    }
    if (!topRelationshipStage) {
      return `最近 7 天开始出现「${recentTopRelationshipStage[0]}」的相处氛围。`;
    }
    if (recentTopRelationshipStage[0] === topRelationshipStage[0]) {
      return `最近 7 天依然以「${recentTopRelationshipStage[0]}」为主，和整体节奏基本一致。`;
    }
    return `最近 7 天更偏「${recentTopRelationshipStage[0]}」，相较整体的「${topRelationshipStage[0]}」有一些变化。`;
  })();
  const recentRelationshipTrendShare = (() => {
    if (!recentTopRelationshipStage || recentRelationshipStageTotalCount === 0) {
      return null;
    }
    const recentPercent = Math.round(
      (recentTopRelationshipStage[1] / recentRelationshipStageTotalCount) * 100
    );
    const overallCount = relationshipStageStats[recentTopRelationshipStage[0]] || 0;
    const overallPercent =
      relationshipStageTotalCount > 0
        ? Math.round((overallCount / relationshipStageTotalCount) * 100)
        : 0;
    const delta = recentPercent - overallPercent;
    return {
      stage: recentTopRelationshipStage[0],
      recentPercent,
      overallPercent,
      delta
    };
  })();
  const formatStagePercent = (count: number, total: number) => {
    if (total <= 0) return 0;
    return Math.round((count / total) * 100);
  };

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <Link to="/">
          <Button icon={<ArrowLeftOutlined />}>返回</Button>
        </Link>
        <div>
          <h1>设置与隐私</h1>
          <p>自定义你的 AI 伴侣，设备权限永远由你主动开启。</p>
        </div>
      </div>
      <div className="settings-grid">
          <Card title="角色设定" className="settings-card--profile">
          <div className="profile-setting-field">
            <label htmlFor="companion-name">AI 伴侣称呼</label>
            <Input
              id="companion-name"
              value={name}
              maxLength={20}
              showCount
              placeholder="例如：小凡、阿璃、星星"
              onChange={event => setName(event.target.value)}
            />
            <span>页面展示和 AI 自我认知都会使用这个称呼。</span>
          </div>
          <div className="profile-setting-field">
            <label htmlFor="companion-personality">性格设定</label>
            <Input.TextArea
              id="companion-personality"
              value={personality}
              maxLength={500}
              showCount
              autoSize={{ minRows: 5, maxRows: 9 }}
              placeholder="描述她的性格、语气和相处方式"
              onChange={event => setPersonality(event.target.value)}
            />
            <span>例如：开朗俏皮、理性成熟、温柔黏人，回复简短自然。</span>
          </div>
          <Space>
            <Button
              type="primary"
              disabled={!name.trim() || !personality.trim()}
              onClick={saveProfile}
            >
              保存角色设定
            </Button>
            <Button onClick={resetProfile}>恢复默认</Button>
          </Space>
          </Card>
          <Card title="回复体验">
          <div className="setting-row">
            <span>默认播放语音</span>
            <Switch defaultChecked />
          </div>
          <div className="setting-row">
            <span>回答时播放动作</span>
            <Switch defaultChecked />
          </div>
        </Card>
          <Card title="虚拟人物">
          <div className="avatar-setting-summary">
            <div>
              <strong>{confirmedAvatar}</strong>
              <span>首页、聊天和直播页面都会固定显示该人物。</span>
            </div>
            <Button
              type="primary"
              icon={<UserSwitchOutlined />}
              onClick={openAvatarModal}
            >
              选择虚拟人物
            </Button>
          </div>
          </Card>
          <Card id="memory-relationship" title="当前关系状态">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div
                id={relationshipMemory ? `memory-item-${relationshipMemory.id}` : undefined}
                className="memory-detail-card"
                data-highlighted={
                    relationshipMemory && activeHighlightedId === relationshipMemory.id
                }
              >
                <strong>系统判断</strong>
                <p style={{ margin: '8px 0 0' }}>
                  {relationshipMemory?.content || '还没有形成稳定关系状态，多聊几轮后这里会更新。'}
                </p>
                {relationshipMemory ? (
                  <Space size="small" wrap style={{ marginTop: 8 }}>
                      <Tooltip
                        title={getRelationshipStageDescription(
                          getRelationshipStage(relationshipMemory)
                        )}
                      >
                      <Tag
                          color={getRelationshipStageTone(getRelationshipStage(relationshipMemory)).color}
                        className={
                          getRelationshipStageTone(getRelationshipStage(relationshipMemory))
                            .className
                        }
                      >
                          {getRelationshipStage(relationshipMemory)}
                      </Tag>
                      </Tooltip>
                    <Tag color="purple">
                      来源：
                      {sourceTypeLabel[relationshipMemory.source_type] ||
                        relationshipMemory.source_type}
                    </Tag>
                    <Tag>更新于 {formatTimestamp(relationshipMemory.updated_at)}</Tag>
                  </Space>
                ) : null}
                  {relationshipMemory && getTriggerExcerpt(relationshipMemory) ? (
                    <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>
                      触发片段：{getTriggerExcerpt(relationshipMemory)}
                    </p>
                  ) : null}
              </div>
              <div>
                <strong>待跟进事项</strong>
                <p style={{ margin: '8px 0 0' }}>
                  当前还有 {followupMemories.length} 条活跃待跟进。
                </p>
              </div>
            </Space>
          </Card>
          <Card title="关系阶段统计">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div className="relationship-metric-grid">
                  <div className="relationship-metric-card">
                    <strong>最近 7 天变化</strong>
                    <span>{recentRelationshipStageItems.length} 次</span>
                    <small>按最近 7 天记录到的关系状态更新次数统计</small>
                  </div>
                  <div className="relationship-metric-card">
                    <strong>最近 7 天阶段种类</strong>
                    <span>{recentRelationshipStageKinds} 种</span>
                    <small>看这周的相处氛围是否比较单一或有变化</small>
                  </div>
                  <div className="relationship-metric-card">
                    <strong>当前阶段</strong>
                    <span>{currentRelationshipStage}</span>
                    <small>系统此刻更倾向怎样理解你们的相处状态</small>
                  </div>
                </div>
              <div className="relationship-stage-summary-grid">
                <div className="relationship-stage-summary">
                  <strong>累计主氛围</strong>
                  <p style={{ margin: '8px 0 0' }}>
                    {topRelationshipStage
                      ? `整体更偏「${topRelationshipStage[0]}」，共出现 ${topRelationshipStage[1]} 次。`
                      : '还没有足够的关系记录，先多聊几轮看看。'}
                  </p>
                </div>
                <div className="relationship-stage-summary">
                  <strong>最近 7 天</strong>
                  <p style={{ margin: '8px 0 0' }}>
                    {recentTopRelationshipStage
                      ? `最近 7 天更偏「${recentTopRelationshipStage[0]}」，共出现 ${recentTopRelationshipStage[1]} 次。`
                      : '最近 7 天还没有新的关系阶段记录。'}
                  </p>
                </div>
              </div>
              <div className="relationship-stage-stats-panel">
                <div>
                  <strong className="relationship-stage-stats-panel__title">累计</strong>
                  <div className="relationship-stage-stats">
                      {sortedRelationshipStages.length > 0 ? (
                        sortedRelationshipStages.map(([stage, count]) => {
                          const percent = formatStagePercent(
                            count,
                            relationshipStageTotalCount
                          );
                          return (
                            <div key={stage} className="relationship-stage-stat">
                              <div className="relationship-stage-stat__header">
                                <Tooltip title={getRelationshipStageDescription(stage)}>
                                  <Tag
                                    color={getRelationshipStageTone(stage).color}
                                    className={getRelationshipStageTone(stage).className}
                                  >
                                    {stage}
                                  </Tag>
                                </Tooltip>
                                <span>{count} 次 · {percent}%</span>
                              </div>
                              <div className="relationship-stage-stat__bar relationship-stage-stat__bar--overall">
                                <span style={{ width: `${percent}%` }} />
                              </div>
                          </div>
                          );
                        })
                    ) : (
                      <span className="relationship-stage-stat__empty">
                        还没有可统计的关系阶段。
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <strong className="relationship-stage-stats-panel__title">
                    最近 7 天
                  </strong>
                  <div className="relationship-stage-stats">
                      {sortedRecentRelationshipStages.length > 0 ? (
                        sortedRecentRelationshipStages.map(([stage, count]) => {
                          const percent = formatStagePercent(
                            count,
                            recentRelationshipStageTotalCount
                          );
                          return (
                            <div key={stage} className="relationship-stage-stat">
                              <div className="relationship-stage-stat__header">
                                <Tooltip title={getRelationshipStageDescription(stage)}>
                                  <Tag
                                    color={getRelationshipStageTone(stage).color}
                                    className={getRelationshipStageTone(stage).className}
                                  >
                                    {stage}
                                  </Tag>
                                </Tooltip>
                                <span>{count} 次 · {percent}%</span>
                              </div>
                              <div className="relationship-stage-stat__bar relationship-stage-stat__bar--recent">
                                <span style={{ width: `${percent}%` }} />
                              </div>
                          </div>
                          );
                        })
                    ) : (
                      <span className="relationship-stage-stat__empty">
                        最近 7 天还没有可统计的关系阶段。
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="relationship-stage-trend-hint">
                <strong>趋势提示</strong>
                <p style={{ margin: '8px 0 0' }}>{relationshipTrendHint}</p>
                  {recentRelationshipTrendShare ? (
                    <p style={{ margin: '8px 0 0' }}>
                      最近 7 天里，「{recentRelationshipTrendShare.stage}」占比约
                      {recentRelationshipTrendShare.recentPercent}%；
                      {recentRelationshipTrendShare.delta === 0
                        ? '和整体占比基本一致。'
                        : recentRelationshipTrendShare.delta > 0
                          ? `比整体高 ${recentRelationshipTrendShare.delta}%。`
                          : `比整体低 ${Math.abs(recentRelationshipTrendShare.delta)}%。`}
                    </p>
                  ) : null}
              </div>
            </Space>
          </Card>
          <Card title="关系变化记录" className="settings-card--timeline">
            <List
              bordered
              loading={memoryLoading}
              locale={{ emptyText: '还没有发生过明显的关系状态变化。' }}
              dataSource={relationshipHistory}
              renderItem={item => (
                  <List.Item
                    className="memory-timeline-item"
                    id={`memory-item-${item.id}`}
                      data-highlighted={activeHighlightedId === item.id}
                  actions={[
                    <Button
                      key="edit"
                      type="link"
                      onClick={() => startEditMemory(item)}
                    >
                      编辑
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="确定删除这条关系状态记录吗？"
                      okText="删除"
                      cancelText="取消"
                      onConfirm={() => void removeMemory(item.id)}
                    >
                      <Button danger type="link">
                        删除
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    title={
                        <Space size="small" wrap className="memory-timeline-item__title">
                        <span>{item.title || '关系状态记录'}</span>
                              <Tooltip
                                title={getRelationshipStageDescription(
                                  getRelationshipStage(item)
                                )}
                              >
                                <Tag
                                  color={getRelationshipStageTone(getRelationshipStage(item)).color}
                                  className={
                                    getRelationshipStageTone(getRelationshipStage(item)).className
                                  }
                                >
                                  {getRelationshipStage(item)}
                                </Tag>
                              </Tooltip>
                        <Tag color="default">历史</Tag>
                        <Tag>
                          来源：{sourceTypeLabel[item.source_type] || item.source_type}
                        </Tag>
                        <Tag>记录于 {formatTimestamp(item.updated_at)}</Tag>
                      </Space>
                      }
                      description={
                        <div className="memory-timeline-item__body">
                          <div>{item.content}</div>
                          {getTriggerExcerpt(item) ? (
                            <div className="memory-timeline-item__meta">
                              触发片段：{getTriggerExcerpt(item)}
                            </div>
                          ) : null}
                        </div>
                      }
                  />
                </List.Item>
              )}
            />
          </Card>
          <Card
            title="置顶记忆"
            extra={<span>当前角色：{confirmedAvatar}</span>}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Input.TextArea
                value={memoryDraft}
                maxLength={120}
                showCount
                autoSize={{ minRows: 2, maxRows: 4 }}
                placeholder="例如：以后叫我阿雨；我很怕打雷；周三提醒我早点睡。"
                onChange={event => setMemoryDraft(event.target.value)}
              />
              {editingMemoryType ? (
                <Tag color={editingMemoryType === 'pinned' ? 'gold' : 'blue'}>
                  正在编辑：{memoryTypeLabel[editingMemoryType] || editingMemoryType}
                </Tag>
              ) : null}
              <Space>
                <Button
                  type="primary"
                  loading={memorySaving}
                  disabled={!memoryDraft.trim()}
                  onClick={() => void submitPinnedMemory()}
                >
                  {editingMemoryId ? '更新记忆' : '新增记忆'}
                </Button>
                <Button
                  disabled={!memoryDraft && !editingMemoryId}
                  onClick={resetMemoryEditor}
                >
                  取消
                </Button>
              </Space>
              <List
                bordered
                loading={memoryLoading}
                locale={{ emptyText: '还没有置顶记忆，添加一条让她更懂你。' }}
                dataSource={pinnedMemories}
                renderItem={item => (
                  <List.Item
                    id={`memory-item-${item.id}`}
                      data-highlighted={activeHighlightedId === item.id}
                    actions={[
                      <Button
                        key="edit"
                        type="link"
                        onClick={() => startEditMemory(item)}
                      >
                        编辑
                      </Button>,
                      <Popconfirm
                        key="delete"
                        title="确定删除这条置顶记忆吗？"
                        okText="删除"
                        cancelText="取消"
                        onConfirm={() => void removeMemory(item.id)}
                      >
                        <Button danger type="link">
                          删除
                        </Button>
                      </Popconfirm>
                    ]}
                  >
                    <List.Item.Meta
                      title={item.title || '置顶记忆'}
                      description={item.content}
                    />
                  </List.Item>
                )}
              />
            </Space>
          </Card>
          <Card id="memory-followups" title="待跟进事项">
            <List
              bordered
              loading={memoryLoading}
              locale={{ emptyText: '暂时没有待跟进的话题。' }}
              dataSource={followupMemories}
              renderItem={item => (
                <List.Item
                    id={`memory-item-${item.id}`}
                      data-highlighted={activeHighlightedId === item.id}
                  actions={[
                    <Button
                      key="complete"
                      type="link"
                      onClick={() =>
                        void updateMemoryStatus(item.id, 'archived', '已标记为完成')
                      }
                    >
                      已完成
                    </Button>,
                    <Button
                      key="edit"
                      type="link"
                      onClick={() => startEditMemory(item)}
                    >
                      编辑
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="确定删除这条待跟进事项吗？"
                      okText="删除"
                      cancelText="取消"
                      onConfirm={() => void removeMemory(item.id)}
                    >
                      <Button danger type="link">
                        删除
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                      title={
                        <Space size="small" wrap>
                        <span>{item.title || '待跟进事项'}</span>
                          <Tag color="processing">待跟进</Tag>
                          <Tag color={getFollowupPriorityLabel(item.importance).color}>
                            {getFollowupPriorityLabel(item.importance).text}
                          </Tag>
                          <Tag>{formatDueHint(item.ttl_at)}</Tag>
                          <Tag>到期：{formatDueDate(item.ttl_at)}</Tag>
                      </Space>
                    }
                      description={
                        <>
                          <div>{item.content}</div>
                          {getTriggerExcerpt(item) ? (
                            <div style={{ marginTop: 6, color: 'var(--muted)' }}>
                              触发片段：{getTriggerExcerpt(item)}
                            </div>
                          ) : null}
                        </>
                      }
                  />
                </List.Item>
              )}
            />
          </Card>
          <Card id="memory-followups-history" title="已完成跟进记录">
            <List
              bordered
              loading={memoryLoading}
              locale={{ emptyText: '还没有已完成的跟进记录。' }}
              dataSource={archivedFollowups}
              renderItem={item => (
                <List.Item
                    id={`memory-item-${item.id}`}
                      data-highlighted={activeHighlightedId === item.id}
                  actions={[
                    <Button
                      key="restore"
                      type="link"
                      onClick={() =>
                        void updateMemoryStatus(item.id, 'active', '已重新加入待跟进')
                      }
                    >
                      重新跟进
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="确定删除这条历史跟进吗？"
                      okText="删除"
                      cancelText="取消"
                      onConfirm={() => void removeMemory(item.id)}
                    >
                      <Button danger type="link">
                        删除
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space size="small" wrap>
                        <span>{item.title || '已完成事项'}</span>
                        <Tag color="success">已完成</Tag>
                          <Tag color={getFollowupPriorityLabel(item.importance).color}>
                            {getFollowupPriorityLabel(item.importance).text}
                          </Tag>
                          <Tag>{formatDueHint(item.ttl_at)}</Tag>
                          <Tag>原到期：{formatDueDate(item.ttl_at)}</Tag>
                        <Tag>更新于 {formatTimestamp(item.updated_at)}</Tag>
                      </Space>
                    }
                      description={
                        <>
                          <div>{item.content}</div>
                          {getTriggerExcerpt(item) ? (
                            <div style={{ marginTop: 6, color: 'var(--muted)' }}>
                              触发片段：{getTriggerExcerpt(item)}
                            </div>
                          ) : null}
                        </>
                      }
                  />
                </List.Item>
              )}
            />
          </Card>
          <Card title="自动记忆">
            <List
              bordered
              loading={memoryLoading}
              locale={{ emptyText: '还没有自动记忆，聊几轮之后这里会慢慢长出来。' }}
              dataSource={generalAutoMemories}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Button
                      key="edit"
                      type="link"
                      onClick={() => startEditMemory(item)}
                    >
                      编辑
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="确定删除这条自动记忆吗？"
                      okText="删除"
                      cancelText="取消"
                      onConfirm={() => void removeMemory(item.id)}
                    >
                      <Button danger type="link">
                        删除
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space size="small">
                        <span>{item.title || '自动记忆'}</span>
                        <Tag>{memoryTypeLabel[item.memory_type] || item.memory_type}</Tag>
                      </Space>
                    }
                    description={item.content}
                  />
                </List.Item>
              )}
            />
          </Card>
        <Card title="隐私原则">
          <ul>
            <li>普通模式不会申请麦克风和摄像头权限。</li>
            <li>照片会在预览确认后发送。</li>
            <li>离开升级模式后会关闭设备媒体轨道。</li>
            <li>持续聆听状态始终显示在页面顶部。</li>
          </ul>
        </Card>
        <Card title="直播输出">
          <p>OBS 浏览器源建议使用：</p>
          <code>/live/stage?transparent=1&amp;subtitle=1</code>
        </Card>
      </div>
      <Modal
        open={avatarModalOpen}
        title="选妃"
        width={860}
        centered
        zIndex={10000}
        getContainer={() => document.body}
        className="avatar-selection-modal"
        onCancel={cancelAvatarSelection}
        footer={[
          <Button key="cancel" onClick={cancelAvatarSelection}>
            取消
          </Button>,
          <Button
            key="confirm"
            type="primary"
            disabled={!selectedAvatar}
            onClick={confirmAvatarSelection}
          >
            点他
          </Button>
        ]}
      >
        <p className="avatar-selection-modal__hint">
          当前展示一位虚拟人物，点击“下一个”浏览下一位，点击“点他”确认选择。
        </p>
        <div className="avatar-selection-modal__body">
          <AvatarLivePreview
            active={avatarModalOpen}
            modelName={selectedAvatar}
          />
          <Button
            icon={<RightOutlined />}
            onClick={() => {
              const currentIndex = ModelDir.indexOf(selectedAvatar);
              const nextModel =
                ModelDir[(currentIndex + 1) % ModelDir.length];
              previewAvatar(nextModel);
            }}
          >
            下一个
          </Button>
        </div>
      </Modal>
    </div>
  );
};
