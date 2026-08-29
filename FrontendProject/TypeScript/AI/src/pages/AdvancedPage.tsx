import React, { useEffect, useState } from 'react';
import { Alert, Button, Modal, Tag } from 'antd';
import { AudioOutlined, StopOutlined } from '@ant-design/icons';
import { AppShell } from '../components/AppShell';
import { ConversationPanel } from '../components/ConversationPanel';
import { DigitalHumanStage } from '../components/DigitalHumanStage';
import { MemoryStatusStrip } from '../components/MemoryStatusStrip';
import { VisionControl } from '../components/VisionControl';
import HandGestureControls from '../components/HandGestureControls';
import { useConversationSession } from '../hooks/useConversationSession';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useCompanionProfile } from '../services/companion-profile.service';

export const AdvancedPage: React.FC = () => {
  const session = useConversationSession('advanced_user', true);
  const { profile } = useCompanionProfile();
  const voice = useVoiceRecorder(session.manager, session.isConnected);
  const [cameraOpenSignal, setCameraOpenSignal] = useState(0);
  const [requestedPrompt, setRequestedPrompt] = useState<string | null>(null);
  const [permissionRequestOpen, setPermissionRequestOpen] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          shouldTakePhoto: boolean;
          prompt?: string;
        }>
      ).detail;
      if (detail?.shouldTakePhoto) {
        setRequestedPrompt(detail.prompt ?? null);
        setPermissionRequestOpen(true);
      }
    };
    window.addEventListener('should-take-photo', handler);
    return () => window.removeEventListener('should-take-photo', handler);
  }, []);

  const voiceButton = (
    <Button
      danger={voice.isRecording}
      type={voice.isRecording ? 'primary' : 'default'}
      icon={voice.isRecording ? <StopOutlined /> : <AudioOutlined />}
      disabled={!session.isConnected}
      onClick={() =>
        voice.isRecording ? voice.stopRecording() : void voice.startRecording()
      }
    >
      {voice.isRecording ? '结束并识别' : '语音输入'}
    </Button>
  );

  return (
    <>
      <AppShell
        mode="advanced"
        connectionState={session.connectionState}
        statusItems={
          <>
            {voice.isRecording && <Tag color="red">正在录音</Tag>}
          </>
        }
        stage={
          <DigitalHumanStage
            subtitle={session.latestAssistantText}
            thinking={session.isThinking}
            streaming={session.isStreamingReply}
          />
        }
      >
        <div className="advanced-workspace">
          <ConversationPanel
            messages={session.messages}
            connected={session.isConnected}
            thinking={session.isThinking}
            audioEnabled={session.audioEnabled}
            onAudioEnabledChange={session.setAudioEnabled}
            onSend={session.sendText}
            onClear={session.clearMessages}
            title="多模态聊天"
              statusStrip={
                <MemoryStatusStrip
                  relationship={session.memorySnapshot.relationship}
                  followups={session.memorySnapshot.followups}
                  refreshing={session.memorySnapshot.refreshing}
                />
              }
            footerExtras={
              <div className="quick-capability-row">
                {voiceButton}
                <VisionControl
                  connected={session.isConnected}
                  openSignal={cameraOpenSignal}
                  requestedPrompt={requestedPrompt}
                  onSend={session.sendImage}
                  compact
                />
                <HandGestureControls />
              </div>
            }
          />
        </div>
      </AppShell>

      <Modal
        open={permissionRequestOpen}
        centered
        zIndex={3000}
        getContainer={() => document.body}
        title={`${profile.name}想看看你`}
        okText="允许一次"
        cancelText="这次不要"
        onCancel={() => setPermissionRequestOpen(false)}
        onOk={() => {
          setPermissionRequestOpen(false);
          setCameraOpenSignal(value => value + 1);
        }}
      >
        <p>
          {requestedPrompt
            ? `为了回答“${requestedPrompt}”，是否允许打开摄像头并由你确认后发送一张照片？`
            : '是否允许打开摄像头？照片会在你确认后才发送。'}
        </p>
      </Modal>
    </>
  );
};
