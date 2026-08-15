import React, { useEffect, useState } from 'react';
import { Alert, Button, Modal, Progress, Tag } from 'antd';
import {
  AudioOutlined,
  EyeOutlined,
  StopOutlined
} from '@ant-design/icons';
import { AppShell } from '../components/AppShell';
import { ConversationPanel } from '../components/ConversationPanel';
import { DigitalHumanStage } from '../components/DigitalHumanStage';
import { VisionControl } from '../components/VisionControl';
import { useConversationSession } from '../hooks/useConversationSession';
import { useHearingMonitor } from '../hooks/useHearingMonitor';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

export const AdvancedPage: React.FC = () => {
  const session = useConversationSession('advanced_user', true);
  const voice = useVoiceRecorder(session.manager, session.isConnected);
  const hearing = useHearingMonitor();
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
            {hearing.isListening && <Tag color="green">持续聆听</Tag>}
          </>
        }
        stage={
          <DigitalHumanStage
            subtitle={session.latestAssistantText}
            thinking={session.isThinking}
            streaming={session.isStreamingReply}
          >
            {hearing.isListening && (
              <div className="hearing-level glass-panel">
                <EyeOutlined />
                <span>环境音量</span>
                <Progress
                  percent={Math.round(hearing.level * 100)}
                  showInfo={false}
                  size="small"
                />
              </div>
            )}
          </DigitalHumanStage>
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
            footerExtras={
              <div className="quick-capability-row">
                {voiceButton}
                <Button
                  icon={hearing.isListening ? <StopOutlined /> : <EyeOutlined />}
                  danger={hearing.isListening}
                  onClick={() =>
                    hearing.isListening ? hearing.stop() : void hearing.start()
                  }
                >
                  {hearing.isListening ? '停止聆听' : '持续聆听'}
                </Button>
              </div>
            }
          />

          <aside className="capability-sidebar glass-panel">
            <div className="capability-card">
              <div className="capability-card__heading">
                <span className="capability-icon">🎤</span>
                <div>
                  <strong>语音</strong>
                  <span>录音结束后自动识别并发送</span>
                </div>
              </div>
              {voiceButton}
              {voice.error && <Alert type="error" showIcon message={voice.error} />}
            </div>

            <VisionControl
              connected={session.isConnected}
              openSignal={cameraOpenSignal}
              requestedPrompt={requestedPrompt}
              onSend={session.sendImage}
            />

            <div className="capability-card">
              <div className="capability-card__heading">
                <span className="capability-icon">👂</span>
                <div>
                  <strong>听觉</strong>
                  <span>本地感知环境音量，不保存原始声音</span>
                </div>
              </div>
              <Button
                danger={hearing.isListening}
                icon={hearing.isListening ? <StopOutlined /> : <EyeOutlined />}
                onClick={() =>
                  hearing.isListening ? hearing.stop() : void hearing.start()
                }
              >
                {hearing.isListening ? '停止持续聆听' : '开启持续聆听'}
              </Button>
              {hearing.isListening && (
                <Progress
                  percent={Math.round(hearing.level * 100)}
                  showInfo={false}
                />
              )}
              {hearing.error && (
                <Alert type="error" showIcon message={hearing.error} />
              )}
              <p className="capability-note">
                当前版本提供语音活动和环境音量感知；环境声音语义识别需要后端听觉模型。
              </p>
            </div>
          </aside>
        </div>
      </AppShell>

      <Modal
        open={permissionRequestOpen}
        title="小凡想看看你"
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
