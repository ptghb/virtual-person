import { useCallback, useEffect, useRef, useState } from 'react';
import { getBackendApiUrl, getWebSocketUrl } from '../config';
import { avatarService } from '../services/avatar.service';
import {
  type ConnectionState,
  type DisplayMessage,
  type ProtocolMessage,
  WebSocketManager
} from '../websocketmanager';

export interface ConversationMessage extends DisplayMessage {
  id: number;
  streaming?: boolean;
  hasStreamed?: boolean;
}

export function useConversationSession(
  clientPrefix: string,
  defaultAudioEnabled = true
) {
  const manager = WebSocketManager.getInstance();
  const idRef = useRef(0);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('disconnected');
  const [audioEnabled, setAudioEnabled] = useState(defaultAudioEnabled);
  const audioEnabledRef = useRef(defaultAudioEnabled);
  const [isThinking, setIsThinking] = useState(false);
  const [isStreamingReply, setIsStreamingReply] = useState(false);
  const [latestAssistantText, setLatestAssistantText] = useState('');

  const appendMessage = useCallback((message: DisplayMessage) => {
    setMessages(previous => [
      ...previous.slice(-99),
      { ...message, id: ++idRef.current }
    ]);
  }, []);

  useEffect(() => {
    manager.clearMessages();
    const unsubscribeMessage = manager.subscribeMessage(message => {
      if (message.streamEvent === 'start' && message.replyId) {
        setMessages(previous => [
          ...previous.slice(-99),
          {
            ...message,
            content: '',
            id: ++idRef.current,
            streaming: true,
            hasStreamed: true
          }
        ]);
        setLatestAssistantText('');
        setIsStreamingReply(true);
        setIsThinking(false);
        return;
      }

      if (message.streamEvent === 'delta' && message.replyId) {
        setMessages(previous => {
          const index = previous.findIndex(
            item => item.replyId === message.replyId
          );
          if (index < 0) {
            return [
              ...previous.slice(-99),
              {
                  ...message,
                  id: ++idRef.current,
                  streaming: true,
                  hasStreamed: true
                }
            ];
          }
          return previous.map((item, itemIndex) =>
            itemIndex === index
              ? {
                  ...item,
                  content: item.content + message.content,
                  streaming: true
                }
              : item
          );
        });
        return;
      }

      if (message.streamEvent === 'audio' && message.audioUrl) {
        if (!audioEnabledRef.current) return;
        avatarService.enqueueStreamingAudio(
          message.replyId ?? '',
          message.sequence ?? 0,
          getBackendApiUrl(message.audioUrl)
        );
        return;
      }

      if (message.streamEvent === 'complete' && message.replyId) {
        setMessages(previous =>
          previous.map(item =>
            item.replyId === message.replyId
              ? {
                  ...item,
                  content: message.content || item.content,
                  streaming: false
                }
              : item
          )
        );
        if (message.content) setLatestAssistantText(message.content);
        setIsStreamingReply(false);
        setIsThinking(false);
        return;
      }

      if (message.streamEvent === 'error') {
        setIsStreamingReply(false);
        setIsThinking(false);
      }

      appendMessage(message);
      if (message.type === 'received' && message.content.trim()) {
        setLatestAssistantText(message.content);
        setIsThinking(false);
        if (message.audioUrl) {
          void avatarService.playReplyAudio(message.audioUrl);
        }
      } else if (message.type === 'error') {
        setIsThinking(false);
      }
    });
    const unsubscribeState = manager.subscribeState(setConnectionState);

    const clientId = `${clientPrefix}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    manager.connect(getWebSocketUrl(clientId));

    return () => {
      unsubscribeMessage();
      unsubscribeState();
      avatarService.stopAudio();
      manager.disconnect();
    };
  }, [appendMessage, clientPrefix, manager]);

  const sendText = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || connectionState !== 'connected') return false;
      avatarService.stopAudio();
      const sent = manager.send({
        text: content,
        model: avatarService.getCurrentModelName(),
        isAudio: audioEnabled
      });
      if (sent) setIsThinking(true);
      return sent;
    },
    [audioEnabled, connectionState, manager]
  );

  const sendImage = useCallback(
    (base64: string, previewUrl: string, prompt: string | null = null) => {
      if (!base64 || connectionState !== 'connected') return false;
      appendMessage({
        type: 'sent',
        content: previewUrl,
        contentType: 'image',
        timestamp: new Date()
      });
      const message: ProtocolMessage = {
        type: 'image',
        data: {
          image: base64,
          format: 'jpeg',
          timestamp: new Date().toISOString(),
          client_id: manager.getClientId(),
          is_audio: audioEnabled,
          prompt: prompt ?? undefined
        }
      };
      const sent = manager.send(message);
      if (sent) setIsThinking(true);
      return sent;
    },
    [appendMessage, audioEnabled, connectionState, manager]
  );

  const clearMessages = useCallback(() => {
    manager.clearMessages();
    setMessages([]);
    setLatestAssistantText('');
    setIsStreamingReply(false);
    avatarService.stopAudio();
  }, [manager]);

  const changeAudioEnabled = useCallback((enabled: boolean) => {
    audioEnabledRef.current = enabled;
    setAudioEnabled(enabled);
    if (!enabled) avatarService.stopAudio();
  }, []);

  return {
    manager,
    messages,
    connectionState,
    isConnected: connectionState === 'connected',
    isThinking,
    isStreamingReply,
    latestAssistantText,
    audioEnabled,
    setAudioEnabled: changeAudioEnabled,
    sendText,
    sendImage,
    clearMessages
  };
}
