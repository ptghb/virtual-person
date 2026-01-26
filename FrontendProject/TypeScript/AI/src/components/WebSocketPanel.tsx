/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import React, { useState, useEffect, useRef } from 'react';
import { WebSocketManager, Message, ConnectionState } from '../websocketmanager';
import { LAppDelegate } from '../lappdelegate';

interface MessageDisplay {
  id: number;
  type: 'received' | 'sent' | 'error' | 'system';
  timestamp: Date;
  content: string;
  contentType?: 'text' | 'image' | 'audio';
}

const WebSocketPanel: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [messages, setMessages] = useState<MessageDisplay[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [sendDisabled, setSendDisabled] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const wsManager = WebSocketManager.getInstance();

  useEffect(() => {
    // 设置状态变化回调
    wsManager.onStateChange((state: ConnectionState) => {
      setConnectionState(state);
      setSendDisabled(state !== 'connected');
    });

    // 设置消息回调
    wsManager.onMessage((message: Message) => {
      const newMessage: MessageDisplay = {
        id: Date.now(),
        type: message.type,
        timestamp: message.timestamp,
        content: message.content,
        contentType: message.contentType,
      };

      setMessages(prev => [...prev, newMessage]);

      // 如果是接收到的消息，使用打字机效果并触发动画
      if (message.type === 'received' && message.contentType === 'text') {
        // 如果指定了动画序号，播放指定动画
        if (message.animation_index !== undefined) {
          try {
            const live2DManager = LAppDelegate.getInstance()
              ._subdelegates.at(0)
              .getLive2DManager();
            live2DManager.playMotionByNo(message.animation_index);
          } catch (error) {
            console.error('Error playing motion by index:', error as Error);
          }
        }
      }
    });

    // 自动连接到WebSocket服务器
    const clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const wsUrl = `ws://47.121.30.160:8000/ws/${clientId}`;
    wsManager.connect(wsUrl);

    // 添加初始提示消息
    const initialMessage: MessageDisplay = {
      id: Date.now(),
      type: 'received',
      timestamp: new Date(),
      content: `WebSocket功能已就绪，客户端ID: ${clientId}`,
    };
    setMessages([initialMessage]);

    return () => {
      WebSocketManager.releaseInstance();
    };
  }, []);

  useEffect(() => {
    // 自动滚动到底部
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    const message = inputValue.trim();
    if (message) {
      // 获取当前Live2D模型名称
      const live2DManager = LAppDelegate.getInstance()
        ._subdelegates.at(0)
        .getLive2DManager();
      const modelName = live2DManager.getCurrentModelName();

      if (wsManager.send({ text: message, model: modelName })) {
        setInputValue('');
      }
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return '#4CAF50';
      case 'connecting':
        return '#ff9800';
      case 'disconnected':
      case 'error':
        return '#f44336';
      default:
        return '#f44336';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return '已连接';
      case 'connecting':
        return '连接中...';
      case 'disconnected':
        return '未连接';
      case 'error':
        return '连接错误';
      default:
        return '未连接';
    }
  };

  return (
    <div id="websocket-container">
      <div id="websocket-header">
        <h3>小凡AI</h3>
        <div id="websocket-status">
          <span id="status-dot" style={{ color: getStatusColor() }}>
            ●
          </span>
          <span id="status-text">{getStatusText()}</span>
        </div>
      </div>
      <div id="websocket-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`websocket-message ${msg.type}`}>
            <span className="message-time">{formatTime(msg.timestamp)}</span>
            {msg.contentType === 'image' ? (
              <img
                src={msg.content}
                alt="图片消息"
                style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px', marginTop: '5px' }}
              />
            ) : msg.contentType === 'audio' ? (
              <audio
                src={msg.content}
                controls
                style={{ width: '100%', marginTop: '5px' }}
              />
            ) : (
              <span className="message-content">{msg.content}</span>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div id="websocket-input">
        <input
          type="text"
          id="ws-message-input"
          placeholder="输入消息发送到服务器..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button id="ws-send-button" disabled={sendDisabled} onClick={handleSendMessage}>
          发送
        </button>
      </div>
    </div>
  );
};

export default WebSocketPanel;
