import React, { useEffect, useState } from 'react';
import { Alert, Button, Modal, Progress, Tag } from 'antd';
import { AudioOutlined, CustomerServiceOutlined, StopOutlined } from '@ant-design/icons';
import { AppShell } from '../components/AppShell';
import { ConversationPanel } from '../components/ConversationPanel';
import { DigitalHumanStage } from '../components/DigitalHumanStage';
import { MemoryStatusStrip } from '../components/MemoryStatusStrip';
import { VisionControl } from '../components/VisionControl';
import HandGestureControls from '../components/HandGestureControls';
import { useConversationSession } from '../hooks/useConversationSession';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useCompanionProfile } from '../services/companion-profile.service';
import { useVoiceActivityRecorder } from '../hooks/useVoiceActivityRecorder';

export const AdvancedPage: React.FC = () => {
  const session = useConversationSession('advanced_user', true);
  const { profile } = useCompanionProfile();
  const voice = useVoiceRecorder(session.manager, session.isConnected);
  const vad = useVoiceActivityRecorder(session.manager, session.isConnected);
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
      disabled={!session.isConnected || vad.state !== 'off'}
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
            {vad.state !== 'off' && (
              <Tag color={vad.state === 'speaking' ? 'red' : 'blue'}>
                {vad.state === 'speaking'
                  ? '检测到说话'
                  : vad.state === 'processing'
                    ? '正在识别'
                    : '等待你说话'}
              </Tag>
            )}
            {vad.interruptLatencyMs !== null && (
              <Tag>打断 {vad.interruptLatencyMs}ms</Tag>
            )}
            {vad.state !== 'off' && (
              <Tag>
                阈值 {vad.diagnostics.startThreshold.toFixed(3)} / 底噪{' '}
                {vad.diagnostics.noiseFloor.toFixed(3)}
              </Tag>
            )}
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
          {(voice.error || vad.error) && (
            <Alert
              type="error"
              showIcon
              message={voice.error || vad.error}
            />
          )}
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
              <>
                {session.proactiveCheckIn && (
                  <Alert
                    type="info"
                    showIcon
                    closable
                    onClose={session.dismissProactiveCheckIn}
                    message={session.proactiveCheckIn.content}
                    action={
                      <Button
                        size="small"
                        type="primary"
                        onClick={session.respondToProactiveCheckIn}
                      >
                        聊聊
                      </Button>
                    }
                  />
                )}
                <MemoryStatusStrip
                  relationship={session.memorySnapshot.relationship}
                  followups={session.memorySnapshot.followups}
                  refreshing={session.memorySnapshot.refreshing}
                />
              </>
            }
            footerExtras={
              <div className="quick-capability-row">
                {voiceButton}
                <Button
                  type={vad.state === 'off' ? 'default' : 'primary'}
                  icon={
                    vad.state === 'off' ? (
                      <CustomerServiceOutlined />
                    ) : (
                      <StopOutlined />
                    )
                  }
                  disabled={!session.isConnected || voice.isRecording}
                  onClick={() =>
                    vad.state === 'off' ? void vad.start() : vad.stop()
                  }
                >
                  {vad.state === 'off' ? '自动聆听' : '停止聆听'}
                </Button>
                {vad.state !== 'off' && (
                  <Progress
                    percent={Math.round(vad.level * 100)}
                    showInfo={false}
                    size="small"
                    style={{ width: 80 }}
                  />
                )}
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
