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
import { useCompanionProfile } from '../services/companion-profile.service';

interface MessageDisplay extends DisplayMessage {
  id: number;
  displayedContent?: string; // 用于打字机效果的显示内容
  isTyping?: boolean; // 是否正在打字
  animation_index?: number; // 动画索引
  isError?: boolean; // 错误状态
}

const WebSocketPanel: React.FC = () => {
  const { profile } = useCompanionProfile();
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [messages, setMessages] = useState<MessageDisplay[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [sendDisabled, setSendDisabled] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
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
      // 清理摄像头资源
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
        cameraStreamRef.current = null;
      }
      // 不释放 WebSocketManager 实例，保持单例
      // WebSocketManager.releaseInstance();
    };
  }, []);

  useEffect(() => {
    // 自动滚动到底部
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 监听拍照指令事件
  useEffect(() => {
    const handleTakePhotoEvent = async (event: Event) => {
      const customEvent = event as CustomEvent<{ shouldTakePhoto: boolean , prompt: string }>;
      if (customEvent.detail.shouldTakePhoto) {
        console.log('[WebSocketPanel] 收到拍照指令，开始执行拍照流程');
        try {
          // 在打开摄像头前保存 audioEnabled 状态
          const currentAudioEnabled = audioEnabled;
          console.log('[WebSocketPanel] 保存当前 audioEnabled 状态:', currentAudioEnabled);

          await openCamera();
          console.log('[WebSocketPanel] 摄像头已打开，开始拍照');
          takePhoto(currentAudioEnabled, customEvent.detail.prompt);
          await closeCamera();
          console.log('[WebSocketPanel] 拍照流程完成');
        } catch (error) {
          console.error('[WebSocketPanel] 自动拍照流程失败:', error);
        }
      }
    };

    // 添加事件监听器
    window.addEventListener('should-take-photo', handleTakePhotoEvent);

    // 清理函数：移除事件监听器
    return () => {
      window.removeEventListener('should-take-photo', handleTakePhotoEvent);
    };
  }, [audioEnabled]);

  // 监听动画切换事件
  useEffect(() => {
    const handleAnimationEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ animationIndex: number }>;
      console.log('[WebSocketPanel] 收到动画切换事件，动画索引:', customEvent.detail.animationIndex);
      try {
        const live2DManager = LAppDelegate.getInstance()
          ._subdelegates.at(0)
          .getLive2DManager();
        live2DManager.playMotionByNo(customEvent.detail.animationIndex);
      } catch (error) {
        console.error('[WebSocketPanel] 播放动画失败:', error);
      }
    };

    // 添加事件监听器
    window.addEventListener('change-animation', handleAnimationEvent);

    // 清理函数：移除事件监听器
    return () => {
      window.removeEventListener('change-animation', handleAnimationEvent);
    };
  }, []);

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
              audioFormat: 'pcm' as AudioFormat,
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
                audioFormat: 'pcm' as AudioFormat,
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

  // 打开摄像头
  const openCamera = async () => {
    try {
      console.log('[WebSocketPanel] 打开摄像头');

      // 先设置状态，让video元素渲染出来
      setIsCameraOpen(true);

      // 等待React重新渲染，video元素被创建
      await new Promise(resolve => setTimeout(resolve, 100));

      // 检查video元素是否存在
      if (!videoRef.current) {
        throw new Error('Video element not found');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      console.log('[WebSocketPanel] 获取视频流成功');

      // 保存视频流引用到ref中，确保在closeCamera时能访问到
      cameraStreamRef.current = stream;
      setVideoStream(stream);

      // 将视频流绑定到video元素
      const video = videoRef.current;
      video.srcObject = stream;
      console.log('[WebSocketPanel] 视频流已绑定到video元素');

      // 等待视频元数据加载完成
      console.log('[WebSocketPanel] 等待视频元数据加载...');
      await new Promise<void>((resolve, reject) => {
        const handleLoadedMetadata = () => {
          console.log('[WebSocketPanel] 视频元数据已加载:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState
          });
          // 清理事件监听器和定时器
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('error', handleError);
          const timeoutId = (video as any)._cameraTimeoutId;
          if (timeoutId) {
            clearTimeout(timeoutId);
            (video as any)._cameraTimeoutId = null;
          }
          resolve();
        };

        const handleError = (error: Event) => {
          console.error('[WebSocketPanel] 视频加载错误:', error);
          // 清理事件监听器和定时器
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('error', handleError);
          const timeoutId = (video as any)._cameraTimeoutId;
          if (timeoutId) {
            clearTimeout(timeoutId);
            (video as any)._cameraTimeoutId = null;
          }
          reject(new Error('Video load error'));
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('error', handleError);

        // 添加超时处理
        const timeoutId = setTimeout(() => {
          if (video.videoWidth === 0) {
            console.error('[WebSocketPanel] 视频加载超时');
            // 清理事件监听器
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            (video as any)._cameraTimeoutId = null;
            reject(new Error('Video loading timeout'));
          }
        }, 5000);

        // 将timeoutId存储到video元素上，以便在关闭时清理
        (video as any)._cameraTimeoutId = timeoutId;
      });

      console.log('[WebSocketPanel] 开始播放视频');
      await video.play();
      console.log('[WebSocketPanel] 视频开始播放');

      // 额外等待一小段时间，确保视频帧已准备好
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('[WebSocketPanel] 视频最终状态:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        currentTime: video.currentTime
      });

      console.log('[WebSocketPanel] 摄像头已成功打开');
    } catch (error) {
      console.error('[WebSocketPanel] 打开摄像头失败:', error);
      alert('无法访问摄像头，请检查权限设置');
      closeCamera();
      throw error; // 重新抛出错误，让调用者知道失败了
    }
  };

  // 关闭摄像头
  const closeCamera = async () => {
    console.log('[WebSocketPanel] 关闭摄像头');

    // 优先使用ref中的视频流，确保能访问到最新的流
    const streamToStop = cameraStreamRef.current || videoStream;

    // 停止视频流的所有音轨
    if (streamToStop) {
      console.log('[WebSocketPanel] 准备停止视频流，音轨数量:', streamToStop.getTracks().length);
      streamToStop.getTracks().forEach(track => {
        console.log('[WebSocketPanel] 停止音轨:', track.kind, track.label, 'readyState:', track.readyState);
        track.stop();
        console.log('[WebSocketPanel] 音轨已停止:', track.kind, 'readyState:', track.readyState);
      });
      // 清空所有视频流引用
      cameraStreamRef.current = null;
      setVideoStream(null);
    } else {
      console.log('[WebSocketPanel] 没有找到需要停止的视频流');
    }

    // 停止视频元素播放并清空源
    if (videoRef.current) {
      const video = videoRef.current;
      console.log('[WebSocketPanel] 停止视频元素播放');
      video.pause();
      video.srcObject = null;
      video.removeAttribute('src'); // 移除src属性
      video.load(); // 重置视频元素状态
    }

    // 等待更长时间，确保摄像头资源完全释放
    await new Promise(resolve => setTimeout(resolve, 500));

    setIsCameraOpen(false);
    console.log('[WebSocketPanel] 摄像头已关闭');
  };

  // 拍照
  const takePhoto = (audioState?: boolean, prompt: string | null = null) => {
    console.log('[WebSocketPanel] 拍照');
    if (!videoRef.current) {
      console.error('[WebSocketPanel] video元素未找到');
      return;
    }

    const video = videoRef.current;
    console.log('[WebSocketPanel] 视频元素状态:', {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
      currentTime: video.currentTime
    });

    // 检查视频是否准备好
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('[WebSocketPanel] 视频未准备好，无法拍照');
      alert('摄像头未准备好，请稍后再试');
      return;
    }

    // 创建canvas来捕获视频帧
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // 绘制视频帧到canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 转换为base64
      const base64Data = canvas.toDataURL('image/jpeg', 0.8);
      const base64Image = base64Data.split(',')[1];

      console.log('[WebSocketPanel] 完整base64Data长度:', base64Data.length);
      console.log('[WebSocketPanel] base64Image长度:', base64Image.length);
      console.log('[WebSocketPanel] base64Image前100字符:', base64Image.substring(0, 100));
      console.log('[WebSocketPanel] base64Image是否为空:', base64Image === '');

      // 在聊天界面显示发送的图片
      const newMessage: MessageDisplay = {
        id: ++messageIdCounter.current,
        type: 'sent',
        timestamp: new Date(),
        content: base64Data, // 完整的data URL
        contentType: 'image',
        isTyping: false,
      };
      setMessages(prev => [...prev, newMessage]);

      // 发送图片消息到WebSocket
      if (wsManager.getState() === 'connected') {
        // 使用传入的 audioState 参数，如果没有传入则使用当前的 audioEnabled 状态
        const isAudioEnabled = audioState !== undefined ? audioState : audioEnabled;
        console.log('[WebSocketPanel] 使用音频状态:', {
          audioState,
          audioEnabled,
          isAudioEnabled
        });

        const imageMessage: ProtocolMessage = {
          type: 'image' as ProtocolMessageType,
          data: {
            image: base64Image,
            format: 'jpeg' as 'jpeg' | 'png' | 'gif' | 'webp',
            timestamp: new Date().toISOString(),
            client_id: wsManager.getClientId(),
            is_audio: isAudioEnabled,
            prompt: prompt // 添加prompt字段
          }
        };
        console.log('[WebSocketPanel] 准备发送的图片消息:', {
          type: imageMessage.type,
          is_audio: imageMessage.data.is_audio,
          hasImage: !!imageMessage.data.image,
          imageSize: imageMessage.data.image?.length,
          format: imageMessage.data.format,
          clientId: imageMessage.data.client_id,
          prompt: imageMessage.data.prompt,
          imageDataPreview: imageMessage.data.image?.substring(0, 50)
        });
        const sendResult = wsManager.send(imageMessage);
        console.log('[WebSocketPanel] 图片消息发送结果:', sendResult);
      } else {
        console.error('[WebSocketPanel] WebSocket未连接，无法发送图片');
        alert('WebSocket未连接，无法发送图片');
      }
    }
  };

  // 切换摄像头状态
  const toggleCamera = async () => {
    console.log('[WebSocketPanel] toggleCamera 被调用, isCameraOpen:', isCameraOpen);

    if (isCameraOpen) {
      console.log('[WebSocketPanel] 摄像头已打开，准备拍照');
      takePhoto(audioEnabled, null);
      await closeCamera();
    } else {
      console.log('[WebSocketPanel] 摄像头未打开，准备打开摄像头');
      try {
        // 在打开摄像头前保存 audioEnabled 状态，避免状态丢失
        const currentAudioEnabled = audioEnabled;
        console.log('[WebSocketPanel] 保存当前 audioEnabled 状态:', currentAudioEnabled);

        await openCamera();
        console.log('[WebSocketPanel] openCamera 完成');

        // 自动拍照、发送、关闭
        console.log('[WebSocketPanel] 自动拍照');
        takePhoto(currentAudioEnabled, null);
        await closeCamera();
      } catch (error) {
        console.error('[WebSocketPanel] openCamera 失败:', error);
      }
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
        <h3>{profile.name} AI</h3>
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
            ) : msg.contentType === 'image' ? (
              <img
                src={msg.content}
                alt="发送的图片"
                style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '5px' }}
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
      {isCameraOpen && (
        <div id="camera-preview" style={{ padding: '10px', textAlign: 'center' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', maxWidth: '400px', borderRadius: '8px' }}
          />
          <div style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
            正在拍照...
          </div>
        </div>
      )}
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
        <button
          id="ws-camera-button"
          onClick={toggleCamera}
          disabled={sendDisabled || isRecording}
        >
          📷 拍照
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
