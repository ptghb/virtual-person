/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, message } from 'antd';
import { ArrowLeftOutlined, CloseOutlined } from '@ant-design/icons';
import { WebSocketManager, ProtocolMessage, ProtocolMessageType, AudioFormat, ControlAction } from '../websocketmanager';
import { getWebSocketUrl } from '../config';
import type { DisplayMessage } from '../websocketmanager';
import { LAppDelegate } from '../lappdelegate';

const LiveStreamPage: React.FC = () => {
  const navigate = useNavigate();
  const [wsManager] = useState(() => WebSocketManager.getInstance());
  const [isConnected, setIsConnected] = useState(false);
  const [messageBubbles, setMessageBubbles] = useState<Array<{ id: number; content: string }>>([]);
  const live2DCanvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 配置 message 显示在顶部
    message.config({
      top: 80,
      duration: 3,
    });

    // 设置状态变化回调
    wsManager.onStateChange((state) => {
      setIsConnected(state === 'connected');
      if (state === 'connected') {
        console.log('[LiveStreamPage] WebSocket连接成功');
      } else if (state === 'error') {
        message.error('WebSocket连接错误');
      }
    });

    // 设置消息回调
    wsManager.onMessage((displayMessage: DisplayMessage) => {
      // 只处理接收到的文本消息
      if (displayMessage.type === 'received' && displayMessage.content) {
        const bubbleId = Date.now();
        const newBubble = {
          id: bubbleId,
          content: displayMessage.content
        };
        setMessageBubbles(prev => [...prev, newBubble]);

        // 10秒后自动关闭泡泡
        setTimeout(() => {
          setMessageBubbles(prev => prev.filter(bubble => bubble.id !== bubbleId));
        }, 10000);

        // 如果有音频URL，使用 LAppAudioManager 播放音频并控制口型同步
        if (displayMessage.audioUrl) {
          try {
            // 获取 Live2D 音频管理器
            const live2DManager = LAppDelegate.getInstance()
              ._subdelegates.at(0)
              .getLive2DManager();
            const audioManager = live2DManager.getAudioManager();

            // 从URL获取音频ArrayBuffer
            fetch(displayMessage.audioUrl)
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
      }
    });

    // 延迟连接到WebSocket服务器，给后端足够的启动时间
    const connectTimer = setTimeout(() => {
      const clientId = 'livestream_user_' + Date.now();
      wsManager.connect(getWebSocketUrl(clientId));
    }, 2000); // 延迟2秒连接

    // 清理函数
    return () => {
      clearTimeout(connectTimer);
      wsManager.disconnect();
    };
  }, [wsManager]);

  const handleBack = () => {
    // 停止音频播放
    try {
      const live2DManager = LAppDelegate.getInstance()
        ._subdelegates.at(0)
        .getLive2DManager();
      const audioManager = live2DManager.getAudioManager();
      audioManager.stop();
    } catch (error) {
      console.error('停止音频失败:', error);
    }

    // 断开 WebSocket 连接
    wsManager.disconnect();

    // 返回首页
    navigate('/');
  };

  const handleCloseBubble = (id: number) => {
    setMessageBubbles(prev => prev.filter(bubble => bubble.id !== id));
  };

  return (
    <div className="livestream-page">
      {/* 返回按钮 */}
      <div className="livestream-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          className="back-button"
        >
          返回
        </Button>
      </div>

      {/* Live2D 画布容器 */}
      <div ref={live2DCanvasRef} className="livestream-canvas-container">
        {/* Live2D 画布将由 LAppDelegate 自动插入 */}
      </div>

      {/* 消息泡泡容器 */}
      <div className="message-bubbles-container">
        {messageBubbles.map(bubble => (
          <div key={bubble.id} className="message-bubble">
            <div className="bubble-content">{bubble.content}</div>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => handleCloseBubble(bubble.id)}
              className="bubble-close"
            />
          </div>
        ))}
      </div>

      {/* 连接状态指示器 */}
      <div className="connection-status">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
        <span className="status-text">
          {isConnected ? '已连接' : '未连接'}
        </span>
      </div>

      <style>{`
        .livestream-page {
          width: 100%;
          min-height: 100vh;
          background: transparent;
          display: flex;
          flex-direction: column;
          pointer-events: auto !important;
          position: relative;
          z-index: 1;
        }

        .livestream-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          padding: 16px;
          z-index: 1000;
          pointer-events: auto !important;
        }

        .back-button {
          color: white;
          font-size: 16px;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          border-radius: 8px;
          padding: 8px 16px;
        }

        .back-button:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.2);
        }

        .livestream-canvas-container {
          flex: 1;
          position: relative;
          width: 100%;
          height: 100vh;
          pointer-events: auto !important;
        }

        /* 消息泡泡容器 */
        .message-bubbles-container {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 9999;
          pointer-events: none;
        }

        /* 消息泡泡 */
        .message-bubble {
          position: relative;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 16px 48px 16px 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          pointer-events: auto;
          animation: slideIn 0.3s ease-out;
          max-width: 100%;
        }

        /* 泡泡内容 */
        .bubble-content {
          color: #333;
          font-size: 16px;
          line-height: 1.6;
          word-wrap: break-word;
          white-space: pre-wrap;
        }

        /* 关闭按钮 */
        .bubble-close {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          min-width: 28px;
          padding: 0;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.1);
          color: #666;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .bubble-close:hover {
          background: rgba(0, 0, 0, 0.2);
          color: #333;
        }

        /* 连接状态指示器 */
        .connection-status {
          position: fixed;
          bottom: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          z-index: 1000;
          pointer-events: auto !important;
        }

        .status-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        .status-indicator.connected {
          background-color: #52c41a;
        }

        .status-indicator.disconnected {
          background-color: #ff4d4f;
        }

        .status-text {
          color: white;
          font-size: 14px;
        }

        /* 动画效果 */
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        /* 确保所有元素可交互 */
        .livestream-page * {
          pointer-events: auto !important;
        }
      `}</style>
    </div>
  );
};

export default LiveStreamPage;
