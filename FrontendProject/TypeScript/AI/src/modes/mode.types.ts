export type AppMode = 'basic' | 'advanced' | 'douyin-live';

export interface ModeCapabilities {
  textInput: boolean;
  ttsOutput: boolean;
  lipSync: boolean;
  replyMotion: boolean;
  speechInput: boolean;
  visionInput: boolean;
  continuousHearing: boolean;
  livestreamInput: boolean;
  obsStage: boolean;
}

export interface ModeDefinition {
  id: AppMode;
  title: string;
  subtitle: string;
  route: string;
  icon: string;
  capabilities: ModeCapabilities;
}
