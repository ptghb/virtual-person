/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import React, { useState, useEffect, useRef } from 'react';
import { WebSocketManager, Message, ConnectionState } from '../websocketmanager';
import { LAppDelegate } from '../lappdelegate';
import { getWebSocketUrl } from '../config';

interface MessageDisplay {
  id: number;
  type: 'received' | 'sent' | 'error' | 'system';
  timestamp: Date;
  content: string;
  contentType?: 'text' | 'image' | 'audio';
  audioUrl?: string;
  displayedContent?: string; // 用于打字机效果的显示内容
  isTyping?: boolean; // 是否正在打字
}

const WebSocketPanel: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [messages, setMessages] = useState<MessageDisplay[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [sendDisabled, setSendDisabled] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdCounter = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const wsManager = WebSocketManager.getInstance();

  useEffect(() => {
    // 设置状态变化回调
    const handleStateChange = (state: ConnectionState) => {
      setConnectionState(state);
      setSendDisabled(state !== 'connected');
    };
    wsManager.onStateChange(handleStateChange);

    // 设置消息回调
    const handleMessage = (message: Message) => {
      const newMessage: MessageDisplay = {
        id: ++messageIdCounter.current,
        type: message.type,
        timestamp: message.timestamp,
        content: message.content,
        contentType: message.contentType || 'text',
        audioUrl: message.audioUrl,
        isTyping: false,
      };

      setMessages(prev => [...prev, newMessage]);

      // 如果是接收到的消息，使用打字机效果并触发动画
      if (message.type === 'received' && (message.contentType === 'text' || message.contentType === undefined)) {
        // 如果有音频URL，使用 LAppAudioManager 播放音频并控制口型同步
        if (message.audioUrl) {
          try {
            // 获取 Live2D 音频管理器
            const live2DManager = LAppDelegate.getInstance()
              ._subdelegates.at(0)
              .getLive2DManager();
            const audioManager = live2DManager.getAudioManager();

            // 从URL获取音频ArrayBuffer
            fetch(message.audioUrl)
              .then(response => response.arrayBuffer())
              .then(arrayBuffer => {
                // 加载音频到音频管理器
                return audioManager.loadAudioFromArrayBuffer(arrayBuffer);
              })
              .then(() => {
                // 播放音频（会自动触发口型同步）
                audioManager.play();
              })
              .catch(error => {
                console.error('播放音频失败:', error);
              });
          } catch (error) {
            console.error('使用 LAppAudioManager 播放音频失败:', error);
          }
        }

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

        // 打字机效果
        let currentIndex = 0;
        const fullText = message.content;
        const typeSpeed = 50; // 每个字符的显示间隔（毫秒）

        const typeNextChar = () => {
          if (currentIndex < fullText.length) {
            currentIndex++;
            const displayedText = fullText.substring(0, currentIndex);
            setMessages(prev =>
              prev.map(msg =>
                msg.id === newMessage.id
                  ? { ...msg, displayedContent: displayedText, isTyping: currentIndex < fullText.length }
                  : msg
              )
            );
            setTimeout(typeNextChar, typeSpeed);
          } else {
            // 打字完成，清除 displayedContent，使用 content 显示
            setMessages(prev =>
              prev.map(msg =>
                msg.id === newMessage.id
                  ? { ...msg, isTyping: false, displayedContent: undefined }
                  : msg
              )
            );
          }
        };

        // 开始打字
        setTimeout(typeNextChar, 100);
      }
    };
    wsManager.onMessage(handleMessage);

    // 延迟连接到WebSocket服务器，给后端足够的启动时间
    const connectTimer = setTimeout(() => {
      const clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const wsUrl = getWebSocketUrl(clientId);
      wsManager.connect(wsUrl);

      // 添加初始提示消息
      const initialMessage: MessageDisplay = {
        id: ++messageIdCounter.current,
        type: 'received',
        timestamp: new Date(),
        content: `WebSocket功能已就绪，客户端ID: ${clientId}`,
        contentType: 'text',
        isTyping: false,
      };
      setMessages([initialMessage]);
    }, 2000); // 延迟2秒连接

    return () => {
      clearTimeout(connectTimer);
      // 不释放 WebSocketManager 实例，保持单例
      // WebSocketManager.releaseInstance();
    };
  }, []);

  useEffect(() => {
    // 自动滚动到底部
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    console.log('发送按钮被点击');
    const message = inputValue.trim();
    console.log('输入内容:', message);
    console.log('连接状态:', connectionState);

    if (!message) {
      console.log('消息为空，不发送');
      return;
    }

    if (connectionState !== 'connected') {
      console.log('WebSocket未连接，无法发送');
      return;
    }

    try {
      // 获取当前Live2D模型名称
      const live2DManager = LAppDelegate.getInstance()
        ._subdelegates.at(0)
        .getLive2DManager();
      const modelName = live2DManager.getCurrentModelName();
      console.log('模型名称:', modelName);

      const sendResult = wsManager.send({
        text: message,
        model: modelName,
        isAudio: audioEnabled
      });
      console.log('发送结果:', sendResult);

      if (sendResult) {
        setInputValue('');
      }
    } catch (error) {
      console.error('发送消息时出错:', error);
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
      <div id="websocket-audio-toggle">
        <label className="audio-toggle-label">
          <input
            type="checkbox"
            checked={audioEnabled}
            onChange={(e) => setAudioEnabled(e.target.checked)}
            className="audio-toggle-checkbox"
          />
          <span className="audio-toggle-slider"></span>
          <span className="audio-toggle-text">语音</span>
        </label>
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
              <span className="message-content">
                {msg.displayedContent !== undefined ? msg.displayedContent : msg.content}
                {msg.isTyping && <span className="typing-cursor">|</span>}
              </span>
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
