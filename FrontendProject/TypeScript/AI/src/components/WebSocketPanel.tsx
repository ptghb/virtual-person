/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import React, { useState, useEffect, useRef } from 'react';
import { WebSocketManager, DisplayMessage, ConnectionState, ProtocolMessage, ProtocolMessageType, AudioFormat, ControlAction } from '../websocketmanager';
import { LAppDelegate } from '../lappdelegate';
import { getWebSocketUrl } from '../config';

interface MessageDisplay extends DisplayMessage {
  id: number;
  displayedContent?: string; // 用于打字机效果的显示内容
  isTyping?: boolean; // 是否正在打字
  animation_index?: number; // 动画索引
  isError?: boolean; // 错误状态
}

const WebSocketPanel: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [messages, setMessages] = useState<MessageDisplay[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [sendDisabled, setSendDisabled] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
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
    const handleMessage = (message: DisplayMessage) => {
      // 过滤掉空内容的消息，避免显示空白消息
      if (!message.content || message.content.trim() === '') {
        console.log('[WebSocketPanel] 忽略空消息:', message);
        return;
      }

      const newMessage: MessageDisplay = {
        ...message,
        id: ++messageIdCounter.current,
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
        if ((message as any).animation_index !== undefined) {
          try {
            const live2DManager = LAppDelegate.getInstance()
              ._subdelegates.at(0)
              .getLive2DManager();
            live2DManager.playMotionByNo((message as any).animation_index);
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
      // 清理录音资源
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        mediaRecorder.stop();
      }
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
      } as {
        text?: string;
        img?: string;
        audio?: string;
        model?: string;
        isAudio?: boolean;
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

  // 开始录音
  const startRecording = async () => {
    try {
      console.log('[WebSocketPanel] 开始录音');

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // 创建MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      // 监听recorder停止事件，确保发送最终数据块
      recorder.onstop = () => {
        console.log('[WebSocketPanel] MediaRecorder已停止');

        // 立即清理状态，防止后续数据发送
        setMediaRecorder(null);
        setIsRecording(false);

        // 发送最终的is_final=true消息（即使没有音频数据也要发送）
        console.log('[WebSocketPanel] 发送最终音频结束标识');
        if (wsManager.getState() === 'connected') {
          // 发送协议格式的音频消息（最终块）
          const audioMessage: ProtocolMessage = {
            type: 'audio' as ProtocolMessageType,
            data: {
              format: 'pcm' as AudioFormat,
              sample_rate: 16000,
              channels: 1,
              chunk: '', // 空数据块表示结束
              is_final: true, // 明确标识这是最后一块音频数据
              timestamp: new Date().toISOString(),
              client_id: wsManager.getClientId()
            }
          };
          // 日志记录
          console.log('[WebSocketPanel] 发送最终音频消息(onstop):', {
            is_final: audioMessage.data.is_final,
            chunk_size: 0,
            timestamp: audioMessage.data.timestamp
          });
          wsManager.send(audioMessage);
        }

        // 通知WebSocket结束语音流
        if (wsManager.getState() === 'connected') {
          const controlMessage: ProtocolMessage = {
            type: 'control' as ProtocolMessageType,
            data: {
              action: 'stop_audio_stream' as ControlAction,
              timestamp: new Date().toISOString(),
              client_id: wsManager.getClientId()
            }
          };
          wsManager.send(controlMessage);
        }

        console.log('[WebSocketPanel] 录音完全停止');
      };

      // 设置录音数据处理
      recorder.ondataavailable = (event) => {
        console.log('[WebSocketPanel] ondataavailable触发 - 当前状态:', {
          isRecording,
          hasMediaRecorder: !!mediaRecorder,
          dataSize: event.data.size,
          recorderState: recorder.state
        });

        // 检查录音器状态而不是React状态（更可靠）
        if (recorder.state !== 'recording') {
          console.log('[WebSocketPanel] MediaRecorder未在录制状态，忽略数据');
          return;
        }

        if (event.data.size > 0) {
          console.log('[WebSocketPanel] 处理音频数据块');

          // 将音频数据发送到WebSocket
          const reader = new FileReader();
          reader.onload = () => {
            // 检查连接状态
            if (wsManager.getState() !== 'connected') {
              console.log('[WebSocketPanel] WebSocket未连接，取消发送');
              return;
            }

            const base64Data = (reader.result as string).split(',')[1];
            // 发送协议格式的音频消息（非最终块）
            const audioMessage: ProtocolMessage = {
              type: 'audio' as ProtocolMessageType,
              data: {
                format: 'pcm' as AudioFormat,
                sample_rate: 16000,
                channels: 1,
                chunk: base64Data,
                is_final: false, // 实时传输的音频块都不是最终块
                timestamp: new Date().toISOString(),
                client_id: wsManager.getClientId()
              }
            };
            // 日志记录（不显示chunk内容）
            console.log('[WebSocketPanel] 发送音频消息:', {
              is_final: audioMessage.data.is_final,
              chunk_size: base64Data.length,
              timestamp: audioMessage.data.timestamp
            });
            wsManager.send(audioMessage);
          };
          reader.readAsDataURL(event.data);
        }
      };

      // 每100ms收集一次数据（但不强制发送，让ondataavailable处理）
      recorder.start(100);

      setMediaRecorder(recorder);
      setIsRecording(true);

      // 通知WebSocket开启语音流
      if (wsManager.getState() === 'connected') {
        // 发送协议格式的控制消息
        const controlMessage: ProtocolMessage = {
          type: 'control' as ProtocolMessageType,
          data: {
            action: 'start_audio_stream' as ControlAction,
            timestamp: new Date().toISOString(),
            client_id: wsManager.getClientId()
          }
        };
        wsManager.send(controlMessage);
      }

      console.log('[WebSocketPanel] 录音已开始');
    } catch (error) {
      console.error('[WebSocketPanel] 录音启动失败:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  // 停止录音
  const stopRecording = () => {
    console.log('[WebSocketPanel] 停止录音 - 当前状态:', { isRecording, hasMediaRecorder: !!mediaRecorder });

    if (mediaRecorder && isRecording) {
      // 立即清理状态，防止后续数据发送
      setIsRecording(false);
      console.log('[WebSocketPanel] 已设置isRecording=false');

      // 只需要调用stop()，让onstop事件处理器来处理后续逻辑
      console.log('[WebSocketPanel] 调用mediaRecorder.stop()');
      mediaRecorder.stop();

      // 停止所有音轨
      mediaRecorder.stream.getTracks().forEach(track => {
        console.log('[WebSocketPanel] 停止音轨:', track.kind);
        track.stop();
      });

      console.log('[WebSocketPanel] stopRecording执行完成');
    } else {
      console.log('[WebSocketPanel] 无法停止录音 - 条件不满足');
    }
  };

  // 切换录音状态
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
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
          <div key={msg.id} className={`websocket-message ${msg.type} ${msg.isError ? 'error' : ''}`}>
            <span className="message-time">{formatTime(msg.timestamp)}</span>
            {msg.contentType === 'audio' ? (
              <audio
                src={msg.content}
                controls
                style={{ width: '100%', marginTop: '5px' }}
              />
            ) : (
              <span className="message-content">
                {msg.content}
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
          disabled={isRecording}
        />
        <button id="ws-send-button" disabled={sendDisabled || isRecording} onClick={handleSendMessage}>
          发送
        </button>
        {audioEnabled && (
          <button
            id="ws-record-button"
            className={isRecording ? 'recording' : ''}
            onClick={toggleRecording}
            disabled={sendDisabled}
          >
            {isRecording ? '⏹️ 停止' : '🎤 语音'}
          </button>
        )}
      </div>
    </div>
  );
};

export default WebSocketPanel;
