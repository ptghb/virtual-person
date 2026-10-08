import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
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
  DatePicker,
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
import type {
  MemoryItem,
  MemoryStatus,
  RelationshipProfile,
  TimelineDaySummary
} from '../services/memory.types';
import { useUserIdentity } from '../services/user-identity.service';
import {
  saveProactivePreferences,
  useProactivePreferences
} from '../services/proactive-preference.service';
import {
  saveVadPreferences,
  useVadPreferences
} from '../services/vad-preference.service';
import {
  saveMicrophonePreferences,
  useMicrophonePreferences
} from '../services/microphone-preference.service';
import {
  resetVoiceMetrics,
  summarizeVoiceMetrics,
  useVoiceMetrics
} from '../services/voice-metrics.service';
import {
  reminderService,
  type Reminder,
  type ReminderRecurrence
} from '../services/reminder.service';

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

interface SettingsPageProps {
  pageType?: 'settings' | 'memory';
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  pageType = 'settings'
}) => {
  const { profile, setCompanionProfile, resetCompanionProfile } =
    useCompanionProfile();
  const location = useLocation();
  const { identity } = useUserIdentity();
  const proactivePreferences = useProactivePreferences();
  const vadPreferences = useVadPreferences();
  const microphonePreferences = useMicrophonePreferences();
  const voiceMetrics = summarizeVoiceMetrics(useVoiceMetrics());
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [microphoneStatus, setMicrophoneStatus] = useState('尚未检测');
  const [microphoneLoading, setMicrophoneLoading] = useState(false);
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
  const [pendingMemories, setPendingMemories] = useState<MemoryItem[]>([]);
  const [archivedFollowups, setArchivedFollowups] = useState<MemoryItem[]>([]);
  const [relationshipHistory, setRelationshipHistory] = useState<MemoryItem[]>(
    []
  );
  const [timelineDays, setTimelineDays] = useState<TimelineDaySummary[]>([]);
  const [relationshipProfile, setRelationshipProfile] =
    useState<RelationshipProfile | null>(null);
  const [memoryDraft, setMemoryDraft] = useState('');
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryType, setEditingMemoryType] = useState<
    MemoryItem['memory_type'] | null
  >(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memorySaving, setMemorySaving] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDueAt, setReminderDueAt] = useState<string | null>(null);
  const [reminderRecurrence, setReminderRecurrence] =
    useState<ReminderRecurrence>('none');
  const [reminderSaving, setReminderSaving] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (window.desktop) return 'granted';
    return 'Notification' in window ? Notification.permission : 'unsupported';
  });
  const highlightedMemoryId =
    new URLSearchParams(location.search).get('highlight') || null;
  const [activeHighlightedId, setActiveHighlightedId] = useState<string | null>(
    highlightedMemoryId
  );
  const isMemoryPage = pageType === 'memory';

  useEffect(() => {
    setName(profile.name);
    setPersonality(profile.personality);
  }, [profile]);

  useEffect(() => {
    let active = true;
    const loadMicrophones = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      try {
        const devices = (
          await navigator.mediaDevices.enumerateDevices()
        ).filter(device => device.kind === 'audioinput');
        if (active) setMicrophones(devices);
      } catch {
        // 未授权时由“检测并授权”按钮展示明确状态。
      }
    };
    void loadMicrophones();
    return () => {
      active = false;
    };
  }, []);


  useEffect(() => {
    let active = true;
    const loadMemories = async () => {
      setMemoryLoading(true);
      try {
        const [
          pinnedResult,
          allResult,
          pendingResult,
          archivedFollowupResult,
          relationshipHistoryResult,
          timelineResult,
          relationshipProfileResult
        ] = await Promise.all([
          memoryService.listMemories(
            identity.userId,
            confirmedAvatar,
            'pinned'
          ),
          memoryService.listMemories(identity.userId, confirmedAvatar),
          memoryService.listMemories(
            identity.userId,
            confirmedAvatar,
            undefined,
            'pending_confirm'
          ),
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
          ),
          memoryService.listTimelineDays(identity.userId, confirmedAvatar),
          memoryService.getRelationshipProfile(identity.userId, confirmedAvatar)
        ]);
        if (active) {
          setPinnedMemories(pinnedResult.items);
          setAutoMemories(
            allResult.items.filter(item => item.memory_type !== 'pinned')
          );
          setPendingMemories(pendingResult.items);
          setArchivedFollowups(archivedFollowupResult.items);
          setRelationshipHistory(relationshipHistoryResult.items);
          setTimelineDays(timelineResult.items);
          setRelationshipProfile(relationshipProfileResult.data);
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

  const reloadReminders = async () => {
    const result = await reminderService.list(
      identity.userId,
      confirmedAvatar
    );
    setReminders(result.items);
  };

  useEffect(() => {
    if (isMemoryPage) return;
    void reloadReminders().catch((error): void => {
      void message.error(
        error instanceof Error ? error.message : '读取提醒失败'
      );
    });
  }, [confirmedAvatar, identity.userId, isMemoryPage]);

  const createReminder = async () => {
    if (!reminderTitle.trim() || !reminderDueAt) return;
    setReminderSaving(true);
    try {
      await reminderService.create({
        user_id: identity.userId,
        companion_id: confirmedAvatar,
        title: reminderTitle.trim(),
        due_at: reminderDueAt,
        recurrence: reminderRecurrence
      });
      setReminderTitle('');
      setReminderDueAt(null);
      setReminderRecurrence('none');
      await reloadReminders();
      void message.success('提醒已创建');
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '创建提醒失败');
    } finally {
      setReminderSaving(false);
    }
  };

  const reloadMemories = async () => {
    const [
      pinnedResult,
      allResult,
      pendingResult,
      archivedFollowupResult,
      relationshipHistoryResult,
      timelineResult,
      relationshipProfileResult
    ] = await Promise.all([
      memoryService.listMemories(identity.userId, confirmedAvatar, 'pinned'),
      memoryService.listMemories(identity.userId, confirmedAvatar),
      memoryService.listMemories(
        identity.userId,
        confirmedAvatar,
        undefined,
        'pending_confirm'
      ),
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
      ),
      memoryService.listTimelineDays(identity.userId, confirmedAvatar),
      memoryService.getRelationshipProfile(identity.userId, confirmedAvatar)
    ]);
    setPinnedMemories(pinnedResult.items);
    setAutoMemories(
      allResult.items.filter(item => item.memory_type !== 'pinned')
    );
    setPendingMemories(pendingResult.items);
    setArchivedFollowups(archivedFollowupResult.items);
    setRelationshipHistory(relationshipHistoryResult.items);
    setTimelineDays(timelineResult.items);
    setRelationshipProfile(relationshipProfileResult.data);
  };

  const resetRelationshipGrowth = async () => {
    try {
      const result = await memoryService.resetRelationshipProfile(
        identity.userId,
        confirmedAvatar
      );
      setRelationshipProfile(result.data);
      void message.success('关系成长进度已重置，历史记忆不会被删除。');
    } catch (error) {
      void message.error(
        error instanceof Error ? error.message : '重置关系成长失败'
      );
    }
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
    const element = document.getElementById(
      `memory-item-${highlightedMemoryId}`
    );
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

  const detectMicrophones = async () => {
    setMicrophoneLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
        device => device.kind === 'audioinput'
      );
      setMicrophones(devices);
      setMicrophoneStatus(
        devices.length ? `已授权，发现 ${devices.length} 个设备` : '已授权，但未发现设备'
      );
    } catch (error) {
      setMicrophoneStatus(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? '权限被拒绝，请在浏览器或系统设置中允许'
          : '无法访问麦克风'
      );
    } finally {
      setMicrophoneLoading(false);
    }
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
      setPinnedMemories(previous =>
        previous.filter(item => item.id !== memoryId)
      );
      setAutoMemories(previous =>
        previous.filter(item => item.id !== memoryId)
      );
      setArchivedFollowups(previous =>
        previous.filter(item => item.id !== memoryId)
      );
      setRelationshipHistory(previous =>
        previous.filter(item => item.id !== memoryId)
      );
      void reloadMemories();
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
    status: Extract<MemoryStatus, 'archived' | 'active' | 'deleted'>,
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

  const requestNotificationPermission = async () => {
    if (window.desktop) {
      setNotificationPermission('granted');
      void message.success('桌面版已使用系统通知');
      return;
    }
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      void message.warning('当前浏览器不支持系统通知');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      void message.success('提醒通知已开启');
    } else {
      void message.warning('未获得通知权限，到期提醒会保留为未通知状态');
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
        return {
          color: '#4f83ff',
          className: 'relationship-stage-tag--comfort'
        };
      case '升温':
        return {
          color: '#ff6b9f',
          className: 'relationship-stage-tag--warmth'
        };
      case '轻松闲聊':
        return {
          color: '#7a8a9a',
          className: 'relationship-stage-tag--casual'
        };
      case '陪伴':
      default:
        return {
          color: '#6fbd72',
          className: 'relationship-stage-tag--support'
        };
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
    Object.entries(relationshipStageStats).sort(
      (left, right) => right[1] - left[1]
    )[0] ?? null;
  const recentTopRelationshipStage =
    Object.entries(recentRelationshipStageStats).sort(
      (left, right) => right[1] - left[1]
    )[0] ?? null;
  const relationshipStageTotalCount = Object.values(
    relationshipStageStats
  ).reduce((sum, count) => sum + count, 0);
  const recentRelationshipStageTotalCount = Object.values(
    recentRelationshipStageStats
  ).reduce((sum, count) => sum + count, 0);
  const sortedRelationshipStages = Object.entries(relationshipStageStats).sort(
    (left, right) => right[1] - left[1]
  );
  const sortedRecentRelationshipStages = Object.entries(
    recentRelationshipStageStats
  ).sort((left, right) => right[1] - left[1]);
  const recentRelationshipStageKinds = Object.keys(
    recentRelationshipStageStats
  ).length;
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
    if (
      !recentTopRelationshipStage ||
      recentRelationshipStageTotalCount === 0
    ) {
      return null;
    }
    const recentPercent = Math.round(
      (recentTopRelationshipStage[1] / recentRelationshipStageTotalCount) * 100
    );
    const overallCount =
      relationshipStageStats[recentTopRelationshipStage[0]] || 0;
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
          <h1>{isMemoryPage ? '记忆管理' : '设置与隐私'}</h1>
          <p>
            {isMemoryPage
              ? '管理她记住的关系状态、置顶记忆和待跟进事项。'
              : '自定义你的 AI 伴侣，设备权限永远由你主动开启。'}
          </p>
        </div>
      </div>
      <div className="settings-grid">
        {!isMemoryPage ? (
          <>
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
            <Card title="主动关心" data-testid="proactive-settings">
              <div className="setting-row">
                <span>允许主动关心</span>
                <Switch
                  checked={proactivePreferences.enabled}
                  onChange={enabled =>
                    saveProactivePreferences({ enabled })
                  }
                />
              </div>
              <div className="setting-row">
                <span>桌面系统通知</span>
                <Switch
                  checked={proactivePreferences.desktopNotifications}
                  disabled={!proactivePreferences.enabled}
                  onChange={desktopNotifications =>
                    saveProactivePreferences({ desktopNotifications })
                  }
                />
              </div>
              <div className="profile-setting-field">
                <label htmlFor="proactive-quiet-start">安静时段</label>
                <Space>
                  <select
                    id="proactive-quiet-start"
                    aria-label="安静时段开始"
                    value={proactivePreferences.quietStart}
                    onChange={event =>
                      saveProactivePreferences({
                        quietStart: Number(event.target.value)
                      })
                    }
                  >
                    {Array.from({ length: 24 }, (_, hour) => (
                      <option key={hour} value={hour}>
                        {String(hour).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                  <span>至</span>
                  <select
                    aria-label="安静时段结束"
                    value={proactivePreferences.quietEnd}
                    onChange={event =>
                      saveProactivePreferences({
                        quietEnd: Number(event.target.value)
                      })
                    }
                  >
                    {Array.from({ length: 24 }, (_, hour) => (
                      <option key={hour} value={hour}>
                        {String(hour).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </Space>
                <span>安静时段不会弹出网页气泡或桌面系统通知。</span>
              </div>
              <div className="profile-setting-field">
                <label htmlFor="proactive-frequency">提醒频率</label>
                <select
                  id="proactive-frequency"
                  aria-label="主动关心频率"
                  value={proactivePreferences.cooldownHours}
                  onChange={event =>
                    saveProactivePreferences({
                      cooldownHours: Number(event.target.value)
                    })
                  }
                >
                  <option value={6}>最多每 6 小时一次</option>
                  <option value={12}>最多每 12 小时一次</option>
                  <option value={24}>最多每天一次</option>
                  <option value={48}>最多每两天一次</option>
                </select>
              </div>
            </Card>
            <Card title="提醒与待办" data-testid="reminder-settings">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space wrap>
                  <Tag
                    color={
                      notificationPermission === 'granted'
                        ? 'success'
                        : notificationPermission === 'denied'
                          ? 'error'
                          : 'warning'
                    }
                  >
                    {notificationPermission === 'granted'
                      ? '通知已开启'
                      : notificationPermission === 'denied'
                        ? '通知已被拒绝'
                        : notificationPermission === 'unsupported'
                          ? '当前环境不支持通知'
                          : '通知尚未授权'}
                  </Tag>
                  {notificationPermission !== 'granted' &&
                  notificationPermission !== 'unsupported' ? (
                    <Button
                      size="small"
                      onClick={() => void requestNotificationPermission()}
                    >
                      开启到期通知
                    </Button>
                  ) : null}
                </Space>
                <Input
                  aria-label="提醒内容"
                  value={reminderTitle}
                  placeholder="例如：吃药、开会、给家里打电话"
                  onChange={event => setReminderTitle(event.target.value)}
                />
                <Space wrap>
                  <DatePicker
                    showTime
                    aria-label="提醒时间"
                    value={reminderDueAt ? dayjs(reminderDueAt) : null}
                    onChange={value =>
                      setReminderDueAt(value?.toISOString() ?? null)
                    }
                    placeholder="选择提醒时间"
                  />
                  <select
                    aria-label="重复规则"
                    value={reminderRecurrence}
                    onChange={event =>
                      setReminderRecurrence(
                        event.target.value as ReminderRecurrence
                      )
                    }
                  >
                    <option value="none">不重复</option>
                    <option value="daily">每天</option>
                    <option value="weekly">每周</option>
                    <option value="monthly">每月</option>
                  </select>
                  <Button
                    type="primary"
                    loading={reminderSaving}
                    disabled={!reminderTitle.trim() || !reminderDueAt}
                    onClick={() => void createReminder()}
                  >
                    新增提醒
                  </Button>
                </Space>
                <List
                  size="small"
                  bordered
                  locale={{ emptyText: '暂无提醒，也可以在聊天中说“明天晚上8点提醒我吃药”。' }}
                  dataSource={reminders}
                  renderItem={item => (
                    <List.Item
                      actions={[
                        <Button
                          key="complete"
                          type="link"
                          onClick={async () => {
                            await reminderService.complete(item.id);
                            await reloadReminders();
                          }}
                        >
                          完成
                        </Button>,
                        <Button
                          key="delete"
                          danger
                          type="link"
                          onClick={async () => {
                            await reminderService.remove(item.id);
                            await reloadReminders();
                          }}
                        >
                          删除
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        title={item.title}
                        description={`${new Date(item.due_at).toLocaleString()} · ${
                          {
                            none: '不重复',
                            daily: '每天',
                            weekly: '每周',
                            monthly: '每月'
                          }[item.recurrence]
                        }`}
                      />
                    </List.Item>
                  )}
                />
              </Space>
            </Card>
            <Card title="麦克风与自动聆听" data-testid="voice-settings">
              <div className="profile-setting-field">
                <label htmlFor="microphone-device">输入设备</label>
                <Space>
                  <select
                    id="microphone-device"
                    aria-label="麦克风输入设备"
                    value={microphonePreferences.deviceId}
                    onChange={event =>
                      saveMicrophonePreferences({
                        deviceId: event.target.value
                      })
                    }
                  >
                    <option value="">系统默认麦克风</option>
                    {microphonePreferences.deviceId &&
                      !microphones.some(
                        device =>
                          device.deviceId === microphonePreferences.deviceId
                      ) && (
                        <option value={microphonePreferences.deviceId}>
                          已选择的麦克风
                        </option>
                      )}
                    {microphones.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `麦克风 ${index + 1}`}
                      </option>
                    ))}
                  </select>
                  <Button loading={microphoneLoading} onClick={detectMicrophones}>
                    检测并授权
                  </Button>
                </Space>
                <span>{microphoneStatus}</span>
              </div>
              <div className="setting-row">
                <span>回声消除</span>
                <Switch
                  checked={microphonePreferences.echoCancellation}
                  onChange={echoCancellation =>
                    saveMicrophonePreferences({ echoCancellation })
                  }
                />
              </div>
              <div className="setting-row">
                <span>环境降噪</span>
                <Switch
                  checked={microphonePreferences.noiseSuppression}
                  onChange={noiseSuppression =>
                    saveMicrophonePreferences({ noiseSuppression })
                  }
                />
              </div>
              <div className="setting-row">
                <span>自动增益</span>
                <Switch
                  checked={microphonePreferences.autoGainControl}
                  onChange={autoGainControl =>
                    saveMicrophonePreferences({ autoGainControl })
                  }
                />
              </div>
              <div className="setting-row">
                <span>语音检测灵敏度</span>
                <select
                  aria-label="语音检测灵敏度"
                  value={vadPreferences.sensitivity}
                  onChange={event =>
                    saveVadPreferences({
                      sensitivity: event.target.value as
                        | 'low'
                        | 'balanced'
                        | 'high'
                    })
                  }
                >
                  <option value="low">低，减少环境噪声触发</option>
                  <option value="balanced">平衡</option>
                  <option value="high">高，更容易检测轻声</option>
                </select>
              </div>
              <div className="profile-setting-field">
                <label htmlFor="vad-minimum-speech">最短有效语音</label>
                <select
                  id="vad-minimum-speech"
                  aria-label="最短有效语音"
                  value={vadPreferences.minimumSpeechMs}
                  onChange={event =>
                    saveVadPreferences({
                      minimumSpeechMs: Number(event.target.value)
                    })
                  }
                >
                  <option value={200}>0.2 秒</option>
                  <option value={320}>0.32 秒</option>
                  <option value={500}>0.5 秒</option>
                  <option value={800}>0.8 秒</option>
                </select>
                <span>低于此时长的声音会被当作噪声丢弃。</span>
              </div>
              <div className="profile-setting-field">
                <label htmlFor="vad-silence">静音多久结束录音</label>
                <select
                  id="vad-silence"
                  aria-label="静音多久结束录音"
                  value={vadPreferences.silenceMs}
                  onChange={event =>
                    saveVadPreferences({ silenceMs: Number(event.target.value) })
                  }
                >
                  <option value={500}>0.5 秒</option>
                  <option value={800}>0.8 秒</option>
                  <option value={1200}>1.2 秒</option>
                  <option value={1600}>1.6 秒</option>
                </select>
                <span>较长的时间适合停顿多、语速慢的表达。</span>
              </div>
              <div className="profile-setting-field">
                <label>本机语音质量统计</label>
                <span>
                  VAD 丢弃率 {(voiceMetrics.vadDiscardRate * 100).toFixed(1)}%
                  （{voiceMetrics.vadDiscarded}/
                  {voiceMetrics.vadAccepted + voiceMetrics.vadDiscarded}）
                </span>
                <span>
                  ASR 失败率 {(voiceMetrics.asrFailureRate * 100).toFixed(1)}%
                  （{voiceMetrics.asrFailed}/
                  {voiceMetrics.asrSucceeded + voiceMetrics.asrFailed}）
                </span>
                <span>
                  ASR 耗时 P50 {voiceMetrics.asrP50 ?? '--'} ms / P95{' '}
                  {voiceMetrics.asrP95 ?? '--'} ms
                </span>
                <span>ASR 超时恢复 {voiceMetrics.asrTimeouts} 次</span>
                <span>
                  打断延迟 P50 {voiceMetrics.interruptP50 ?? '--'} ms / P95{' '}
                  {voiceMetrics.interruptP95 ?? '--'} ms
                </span>
                <span>已忽略过期 ASR 响应 {voiceMetrics.staleAsrResponses} 次</span>
                <Button size="small" onClick={resetVoiceMetrics}>
                  清空统计
                </Button>
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
          </>
        ) : null}
        {isMemoryPage ? (
          <>
            <Card
              title="关系成长"
              extra={
                <Popconfirm
                  title="重置关系成长进度？"
                  description="亲近感、信任感和互动计数会清零，历史记忆不会删除。"
                  okText="重置"
                  cancelText="取消"
                  onConfirm={() => void resetRelationshipGrowth()}
                >
                  <Button danger type="link">
                    重置进度
                  </Button>
                </Popconfirm>
              }
            >
              <div className="relationship-metric-grid">
                <div className="relationship-metric-card">
                  <strong>当前阶段</strong>
                  <span>{relationshipProfile?.stage || '加载中'}</span>
                  <small>由稳定互动逐步推进，不会因为单次聊天倒退。</small>
                </div>
                <div className="relationship-metric-card">
                  <strong>亲近感</strong>
                  <span>{relationshipProfile?.affinity_score ?? 0}/100</span>
                  <small>温暖、共同完成和日常相处会积累。</small>
                </div>
                <div className="relationship-metric-card">
                  <strong>信任感</strong>
                  <span>{relationshipProfile?.trust_score ?? 0}/100</span>
                  <small>愿意分享真实感受时会缓慢积累。</small>
                </div>
                <div className="relationship-metric-card">
                  <strong>共同经历</strong>
                  <span>{relationshipProfile?.shared_event_count ?? 0} 次</span>
                  <small>
                    已互动 {relationshipProfile?.interaction_count ?? 0} 次
                  </small>
                </div>
              </div>
              <p style={{ margin: '16px 0 0', color: 'var(--muted)' }}>
                关系成长只影响陪伴语气和可回忆的共同经历，不用于评价、限制或区别对待用户。
              </p>
            </Card>
            <Card
              id="memory-relationship"
              title="当前关系状态与置顶记忆"
              extra={<span>当前角色：{confirmedAvatar}</span>}
            >
              <Space
                direction="vertical"
                style={{ width: '100%' }}
                size="middle"
              >
                <div className="memory-combined-section">
                  <strong>当前关系状态</strong>
                  <div
                    id={
                      relationshipMemory
                        ? `memory-item-${relationshipMemory.id}`
                        : undefined
                    }
                    className="memory-detail-card"
                    data-highlighted={
                      relationshipMemory &&
                      activeHighlightedId === relationshipMemory.id
                    }
                  >
                    <strong>系统判断</strong>
                    <p style={{ margin: '8px 0 0' }}>
                      {relationshipMemory?.content ||
                        '还没有形成稳定关系状态，多聊几轮后这里会更新。'}
                    </p>
                    {relationshipMemory ? (
                      <Space size="small" wrap style={{ marginTop: 8 }}>
                        <Tooltip
                          title={getRelationshipStageDescription(
                            getRelationshipStage(relationshipMemory)
                          )}
                        >
                          <Tag
                            color={
                              getRelationshipStageTone(
                                getRelationshipStage(relationshipMemory)
                              ).color
                            }
                            className={
                              getRelationshipStageTone(
                                getRelationshipStage(relationshipMemory)
                              ).className
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
                        <Tag>
                          更新于 {formatTimestamp(relationshipMemory.updated_at)}
                        </Tag>
                      </Space>
                    ) : null}
                    {relationshipMemory &&
                    getTriggerExcerpt(relationshipMemory) ? (
                      <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>
                        触发片段：{getTriggerExcerpt(relationshipMemory)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="memory-combined-section">
                  <strong>置顶记忆</strong>
                  <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>
                    手动添加不会自动消失的重要信息，会优先影响她的陪伴方式。
                  </p>
                </div>
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
                    正在编辑：
                    {memoryTypeLabel[editingMemoryType] || editingMemoryType}
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
            <Card title="关系阶段统计">
              <Space
                direction="vertical"
                style={{ width: '100%' }}
                size="middle"
              >
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
                    <strong className="relationship-stage-stats-panel__title">
                      累计
                    </strong>
                    <div className="relationship-stage-stats">
                      {sortedRelationshipStages.length > 0 ? (
                        sortedRelationshipStages.map(([stage, count]) => {
                          const percent = formatStagePercent(
                            count,
                            relationshipStageTotalCount
                          );
                          return (
                            <div
                              key={stage}
                              className="relationship-stage-stat"
                            >
                              <div className="relationship-stage-stat__header">
                                <Tooltip
                                  title={getRelationshipStageDescription(stage)}
                                >
                                  <Tag
                                    color={
                                      getRelationshipStageTone(stage).color
                                    }
                                    className={
                                      getRelationshipStageTone(stage).className
                                    }
                                  >
                                    {stage}
                                  </Tag>
                                </Tooltip>
                                <span>
                                  {count} 次 · {percent}%
                                </span>
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
                            <div
                              key={stage}
                              className="relationship-stage-stat"
                            >
                              <div className="relationship-stage-stat__header">
                                <Tooltip
                                  title={getRelationshipStageDescription(stage)}
                                >
                                  <Tag
                                    color={
                                      getRelationshipStageTone(stage).color
                                    }
                                    className={
                                      getRelationshipStageTone(stage).className
                                    }
                                  >
                                    {stage}
                                  </Tag>
                                </Tooltip>
                                <span>
                                  {count} 次 · {percent}%
                                </span>
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
                      最近 7 天里，「{recentRelationshipTrendShare.stage}
                      」占比约
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
                        <Space
                          size="small"
                          wrap
                          className="memory-timeline-item__title"
                        >
                          <span>{item.title || '关系状态记录'}</span>
                          <Tooltip
                            title={getRelationshipStageDescription(
                              getRelationshipStage(item)
                            )}
                          >
                            <Tag
                              color={
                                getRelationshipStageTone(
                                  getRelationshipStage(item)
                                ).color
                              }
                              className={
                                getRelationshipStageTone(
                                  getRelationshipStage(item)
                                ).className
                              }
                            >
                              {getRelationshipStage(item)}
                            </Tag>
                          </Tooltip>
                          <Tag color="default">历史</Tag>
                          <Tag>
                            来源：
                            {sourceTypeLabel[item.source_type] ||
                              item.source_type}
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
            <Card id="memory-followups" title="待跟进事项与完成记录">
              <Space
                direction="vertical"
                style={{ width: '100%' }}
                size="large"
              >
                <div>
                  <strong>待跟进事项</strong>
                  <List
                    bordered
                    loading={memoryLoading}
                    style={{ marginTop: 8 }}
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
                              void updateMemoryStatus(
                                item.id,
                                'archived',
                                '已标记为完成'
                              )
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
                              <Tag
                                color={
                                  getFollowupPriorityLabel(item.importance).color
                                }
                              >
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
                                <div
                                  style={{ marginTop: 6, color: 'var(--muted)' }}
                                >
                                  触发片段：{getTriggerExcerpt(item)}
                                </div>
                              ) : null}
                            </>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </div>

                <div>
                  <strong>已完成跟进记录</strong>
                  <List
                    bordered
                    loading={memoryLoading}
                    style={{ marginTop: 8 }}
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
                              void updateMemoryStatus(
                                item.id,
                                'active',
                                '已重新加入待跟进'
                              )
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
                              <Tag
                                color={
                                  getFollowupPriorityLabel(item.importance).color
                                }
                              >
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
                                <div
                                  style={{ marginTop: 6, color: 'var(--muted)' }}
                                >
                                  触发片段：{getTriggerExcerpt(item)}
                                </div>
                              ) : null}
                            </>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </div>
              </Space>
            </Card>
            <Card id="memory-timeline" title="每日对话时间线">
              <List
                bordered
                loading={memoryLoading}
                locale={{
                  emptyText: '还没有每日总结。继续聊天后，每天的对话重点会出现在这里。'
                }}
                dataSource={timelineDays}
                renderItem={item => (
                  <List.Item className="memory-timeline-item">
                    <List.Item.Meta
                      title={
                        <Space
                          size="small"
                          wrap
                          className="memory-timeline-item__title"
                        >
                          <span>{item.date}</span>
                          <Tag color="blue">每日总结</Tag>
                          <Tag>记录 {item.event_count} 条</Tag>
                          {item.last_occurred_at ? (
                            <Tag>最后更新 {formatTimestamp(item.last_occurred_at)}</Tag>
                          ) : null}
                        </Space>
                      }
                      description={
                        <div className="memory-timeline-item__body">
                          <div>{item.summary}</div>
                          {item.highlights.length > 0 ? (
                            <div className="memory-timeline-item__meta">
                              重点：{item.highlights.slice(0, 3).join('；')}
                            </div>
                          ) : null}
                        </div>
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
                style={{ marginBottom: 16 }}
                header={<strong>待确认记忆</strong>}
                locale={{
                  emptyText: '暂无需要确认的记忆。'
                }}
                dataSource={pendingMemories}
                renderItem={item => (
                  <List.Item
                    id={`memory-item-${item.id}`}
                    actions={[
                      <Button
                        key="confirm"
                        type="link"
                        onClick={() =>
                          void updateMemoryStatus(
                            item.id,
                            'active',
                            '已确认并启用这条记忆'
                          )
                        }
                      >
                        确认
                      </Button>,
                      <Button
                        key="ignore"
                        danger
                        type="link"
                        onClick={() =>
                          void updateMemoryStatus(
                            item.id,
                            'deleted',
                            '已忽略这条记忆'
                          )
                        }
                      >
                        忽略
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space size="small" wrap>
                          <span>{item.title || '待确认记忆'}</span>
                          <Tag color="warning">待确认</Tag>
                          <Tag>
                            {memoryTypeLabel[item.memory_type] ||
                              item.memory_type}
                          </Tag>
                          <Tag>
                            置信度 {(item.confidence * 100).toFixed(0)}%
                          </Tag>
                          <Tag>
                            来源：
                            {sourceTypeLabel[item.source_type] ||
                              item.source_type}
                          </Tag>
                        </Space>
                      }
                      description={
                        <div>
                          <div>{item.content}</div>
                          {item.normalized_json?.conflict_detected ? (
                            <div style={{ marginTop: 6, color: 'var(--muted)' }}>
                              检测到与既有记忆冲突，确认后将采用这条新内容。
                            </div>
                          ) : null}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
              <List
                bordered
                loading={memoryLoading}
                locale={{
                  emptyText: '还没有自动记忆，聊几轮之后这里会慢慢长出来。'
                }}
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
                          <Tag>
                            {memoryTypeLabel[item.memory_type] ||
                              item.memory_type}
                          </Tag>
                        </Space>
                      }
                      description={item.content}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </>
        ) : null}
        {!isMemoryPage ? (
          <>
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
          </>
        ) : null}
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
              const nextModel = ModelDir[(currentIndex + 1) % ModelDir.length];
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
