import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Empty, Input, Switch, Tooltip } from 'antd';
import {
  ClearOutlined,
  SendOutlined,
  SoundOutlined,
  StopOutlined
} from '@ant-design/icons';
import type { ConversationMessage } from '../hooks/useConversationSession';
import { avatarService } from '../services/avatar.service';
import { TypewriterText } from './TypewriterText';
import { useCompanionProfile } from '../services/companion-profile.service';

interface ConversationPanelProps {
  messages: ConversationMessage[];
  connected: boolean;
  thinking: boolean;
  audioEnabled: boolean;
  onAudioEnabledChange: (enabled: boolean) => void;
  onSend: (text: string) => boolean;
  onClear: () => void;
  title?: string;
  footerExtras?: React.ReactNode;
  statusStrip?: React.ReactNode;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  messages,
  connected,
  thinking,
  audioEnabled,
  onAudioEnabledChange,
  onSend,
  onClear,
  title,
  footerExtras,
  statusStrip
}) => {
  const { profile } = useCompanionProfile();
  const panelTitle = title ?? `和${profile.name}聊天`;
  const [value, setValue] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const scrollToEnd = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, scrollToEnd, thinking]);

  const submit = () => {
    if (onSend(value)) setValue('');
  };

  return (
    <div className="conversation-panel glass-panel">
      <div className="conversation-panel__header">
        <div className="conversation-panel__heading">
          <div className="conversation-panel__title-block">
            <strong>{panelTitle}</strong>
            <span>{connected ? '随时可以说话' : '正在等待连接'}</span>
          </div>
          {statusStrip}
        </div>
        <div className="conversation-panel__tools">
          <Tooltip title="停止当前语音">
            <Button
              type="text"
              icon={<StopOutlined />}
              onClick={() => avatarService.stopAudio()}
            />
          </Tooltip>
          <Tooltip title="清空本地消息">
            <Button type="text" icon={<ClearOutlined />} onClick={onClear} />
          </Tooltip>
          <label className="audio-switch">
            <SoundOutlined />
            <Switch
              size="small"
              checked={audioEnabled}
              onChange={onAudioEnabledChange}
            />
          </label>
        </div>
      </div>

      <div className="conversation-panel__messages">
        {messages.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={`跟${profile.name}说句话吧`}
          />
        ) : (
          messages
            .filter(message => message.type !== 'system')
            .filter(
              message => !(message.type === 'received' && message.streaming)
            )
            .map(message => (
              <div
                key={message.id}
                className={`chat-message chat-message--${message.type}`}
              >
                {message.contentType === 'image' ? (
                  <img
                    src={message.content}
                    alt={`发送给${profile.name}的照片`}
                  />
                ) : message.streaming ? (
                  <span className="typewriter-text">
                    {message.content}
                    <i className="typewriter-cursor" aria-hidden="true" />
                  </span>
                ) : message.type === 'received' ? (
                  <TypewriterText
                    text={message.content}
                    onProgress={scrollToEnd}
                  />
                ) : (
                  <span>{message.content}</span>
                )}
                <time>
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </time>
              </div>
            ))
        )}
        {thinking && (
          <div className="chat-message chat-message--received chat-message--thinking">
            <i />
            <i />
            <i />
          </div>
        )}
        <div ref={endRef} />
      </div>

      {footerExtras && (
        <div className="conversation-panel__extras">{footerExtras}</div>
      )}
      <div className="conversation-composer">
        <Input.TextArea
          value={value}
          onChange={event => setValue(event.target.value)}
          placeholder={connected ? '输入消息…' : '正在连接服务器…'}
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={!connected}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          disabled={!connected || !value.trim()}
          onClick={submit}
        >
          发送
        </Button>
      </div>
    </div>
  );
};
