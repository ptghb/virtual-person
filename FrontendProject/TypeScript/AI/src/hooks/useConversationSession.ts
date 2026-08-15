import { useCallback, useEffect, useRef, useState } from 'react';
import { getWebSocketUrl } from '../config';
import { avatarService } from '../services/avatar.service';
import {
  type ConnectionState,
  type DisplayMessage,
  type ProtocolMessage,
  WebSocketManager
} from '../websocketmanager';

export interface ConversationMessage extends DisplayMessage {
  id: number;
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
  const [isThinking, setIsThinking] = useState(false);
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
  }, [manager]);

  return {
    manager,
    messages,
    connectionState,
    isConnected: connectionState === 'connected',
    isThinking,
    latestAssistantText,
    audioEnabled,
    setAudioEnabled,
    sendText,
    sendImage,
    clearMessages
  };
}
