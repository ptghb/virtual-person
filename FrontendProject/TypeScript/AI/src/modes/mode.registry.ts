import type { AppMode, ModeDefinition } from './mode.types';

export const MODE_REGISTRY: Record<AppMode, ModeDefinition> = {
  basic: {
    id: 'basic',
    title: '普通模式',
    subtitle: '轻松聊天，不使用摄像头和麦克风',
    route: '/chat',
    icon: '💬',
    capabilities: {
      textInput: true,
      ttsOutput: true,
      lipSync: true,
      replyMotion: true,
      speechInput: false,
      visionInput: false,
      continuousHearing: false,
      livestreamInput: false,
      obsStage: false
    }
  },
  advanced: {
    id: 'advanced',
    title: '升级模式',
    subtitle: '语音与视觉',
    route: '/advanced',
    icon: '✨',
    capabilities: {
      textInput: true,
      ttsOutput: true,
      lipSync: true,
      replyMotion: true,
      speechInput: true,
      visionInput: true,
      continuousHearing: true,
      livestreamInput: false,
      obsStage: false
    }
  },
  'douyin-live': {
    id: 'douyin-live',
    title: '抖音直播模式',
    subtitle: '接入直播评论并自动互动',
    route: '/live/console',
    icon: '🎬',
    capabilities: {
      textInput: true,
      ttsOutput: true,
      lipSync: true,
      replyMotion: true,
      speechInput: false,
      visionInput: false,
      continuousHearing: false,
      livestreamInput: true,
      obsStage: true
    }
  }
};
