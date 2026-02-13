/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Typography, Card, Input, Space, message } from 'antd';
import { ArrowLeftOutlined, SendOutlined, AudioOutlined, CloseOutlined } from '@ant-design/icons';
import { WebSocketManager } from '../websocketmanager';
import { getWebSocketUrl } from '../config';
import type { DisplayMessage } from '../websocketmanager';
import { LAppDelegate } from '../lappdelegate';

const { Title, Paragraph } = Typography;

const MobilePage: React.FC = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [wsManager] = useState(() => WebSocketManager.getInstance());
  const [isConnected, setIsConnected] = useState(false);
  const [messageBubbles, setMessageBubbles] = useState<Array<{ id: number; content: string }>>([]);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  useEffect(() => {
    // 设置状态变化回调
    wsManager.onStateChange((state) => {
      setIsConnected(state === 'connected');
      if (state === 'connected') {
        message.success('WebSocket连接成功');
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
      const clientId = 'mobile_user_' + Date.now();
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

  const handleSend = () => {
    if (inputValue.trim()) {
      if (!isConnected) {
        message.warning('未连接到服务器，请稍后再试');
        return;
      }

      // 通过WebSocket发送消息到后端
      const success = wsManager.send({
        text: inputValue,
        isAudio: audioEnabled // 根据当前音频设置决定是否需要语音回复
      });

      if (success) {
        console.log('发送消息成功:', inputValue);
        message.success('消息已发送');
        setInputValue('');
      } else {
        message.error('发送消息失败');
      }
    }
  };

  const handleVoice = () => {
    console.log('语音按钮被点击');
    // TODO: 实现语音输入功能
    message.info('语音功能开发中...');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleSend();
    }
  };

  const handleCloseBubble = (id: number) => {
    setMessageBubbles(prev => prev.filter(bubble => bubble.id !== id));
  };

  return (
    <div className="mobile-page">
      {/*<div className="mobile-header">*/}
      {/*  <Button*/}
      {/*    type="text"*/}
      {/*    icon={<ArrowLeftOutlined />}*/}
      {/*    onClick={handleBack}*/}
      {/*    className="back-button"*/}
      {/*  >*/}
      {/*    返回*/}
      {/*  </Button>*/}
      {/*</div>*/}

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

      <div className="mobile-footer">
        <div className="input-container">
          <Input
            placeholder="输入消息..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="message-input"
          />
          <Space size={8} className="button-group">
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              className="send-button"
            >
              发送
            </Button>
            <Button
              icon={<AudioOutlined />}
              onClick={handleVoice}
              className="voice-button"
            />
          </Space>
        </div>
      </div>

      <style>{`
        .mobile-page {
          width: 100%;
          min-height: 100vh;
          background: transparent;
          display: flex;
          flex-direction: column;
          pointer-events: auto !important;
          position: relative;
          z-index: 1;
        }

        .mobile-header {
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          pointer-events: auto !important;
          position: relative;
          z-index: 1;
        }

        .back-button {
          color: white;
          font-size: 16px;
        }

        .back-button:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.2);
        }

        .mobile-content {
          flex: 1;
          padding: 20px;
          padding-bottom: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: auto !important;
          position: relative;
          z-index: 1;
        }

        .mobile-card {
          width: 100%;
          max-width: 400px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          pointer-events: auto !important;
          position: relative;
          z-index: 1;
        }

        .mobile-footer {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          padding: 12px 16px !important;
          background: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(10px) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.2) !important;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1) !important;
          z-index: 10000 !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }

        .mobile-footer * {
          pointer-events: auto !important;
        }

        .input-container {
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          max-width: 400px !important;
          margin: 0 auto !important;
          pointer-events: auto !important;
        }

        .message-input {
          flex: 1 !important;
          border-radius: 20px !important;
          height: 40px !important;
          font-size: 14px !important;
          padding: 8px 16px !important;
          pointer-events: auto !important;
        }

        .button-group {
          display: flex !important;
          align-items: center !important;
          pointer-events: auto !important;
        }

        .send-button {
          border-radius: 20px !important;
          pointer-events: auto !important;
        }

        .voice-button {
          border-radius: 50% !important;
          width: 40px !important;
          height: 40px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          pointer-events: auto !important;
        }

        /* 消息泡泡容器 */
        .message-bubbles-container {
          position: fixed;
          bottom: 80px;
          left: 16px;
          right: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 9999;
          pointer-events: none;
        }

        /* 消息泡泡 */
        .message-bubble {
          position: relative;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 12px 40px 12px 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          pointer-events: auto;
          animation: slideIn 0.3s ease-out;
          max-width: 100%;
        }

        /* 泡泡内容 */
        .bubble-content {
          color: #333;
          font-size: 14px;
          line-height: 1.5;
          word-wrap: break-word;
          white-space: pre-wrap;
        }

        /* 关闭按钮 */
        .bubble-close {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 24px;
          height: 24px;
          min-width: 24px;
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

        @media screen and (max-width: 768px) and (orientation: landscape) and (hover: none) {
          .mobile-page::before {
            content: '请将手机竖屏使用';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            z-index: 9999;
            pointer-events: auto !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MobilePage;
