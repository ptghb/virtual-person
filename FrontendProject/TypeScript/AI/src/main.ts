/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { LAppDelegate } from './lappdelegate';
import * as LAppDefine from './lappdefine';
import {
  WebSocketManager,
  Message,
  ConnectionState,
  ContentType
} from './websocketmanager';

/**
 * 浏览器加载后的处理
 */
window.addEventListener(
  'load',
  (): void => {
    // Initialize WebGL and create the application instance
    if (!LAppDelegate.getInstance().initialize()) {
      return;
    }

    // 初始化音频控制UI
    initializeAudioControls();

    // 初始化WebSocket控制UI
    initializeWebSocketControls();

    LAppDelegate.getInstance().run();
  },
  { passive: true }
);

/**
 * 结束时的处理
 */
window.addEventListener(
  'beforeunload',
  (): void => {
    LAppDelegate.releaseInstance();
    WebSocketManager.releaseInstance();
  },
  { passive: true }
);

/**
 * 初始化音频控制UI
 */
function initializeAudioControls(): void {
  const audioUpload = document.getElementById(
    'audio-upload'
  ) as HTMLInputElement;
  const playButton = document.getElementById('play-audio') as HTMLButtonElement;
  const stopButton = document.getElementById('stop-audio') as HTMLButtonElement;
  const startRecordingButton = document.getElementById(
    'start-recording'
  ) as HTMLButtonElement;
  const stopRecordingButton = document.getElementById(
    'stop-recording'
  ) as HTMLButtonElement;
  const statusDiv = document.getElementById('audio-status') as HTMLDivElement;

  if (
    !audioUpload ||
    !playButton ||
    !stopButton ||
    !statusDiv
    // ||
    // !startRecordingButton ||
    // !stopRecordingButton
  ) {
    console.error('Audio control elements not found');
    return;
  }

  // 音频上传处理
  audioUpload.addEventListener('change', (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) {
      return;
    }

    statusDiv.textContent = '正在加载音频...';

    const audioManager = LAppDelegate.getInstance()
      ._subdelegates.at(0)
      .getLive2DManager()
      .getAudioManager();

    audioManager
      .loadAudioFromFile(file)
      .then(success => {
        if (success) {
          statusDiv.textContent = `已加载: ${file.name}`;
          playButton.disabled = false;
          stopButton.disabled = true;
        } else {
          statusDiv.textContent = '音频加载失败';
          playButton.disabled = true;
          stopButton.disabled = true;
        }
      })
      .catch(error => {
        console.error('Error loading audio:', error);
        statusDiv.textContent = '音频加载出错';
        playButton.disabled = true;
        stopButton.disabled = true;
      });
  });

  // 播放按钮处理
  playButton.addEventListener('click', () => {
    try {
      const audioManager = LAppDelegate.getInstance()
        ._subdelegates.at(0)
        .getLive2DManager()
        .getAudioManager();

      if (audioManager.isLoaded()) {
        audioManager.play();
        statusDiv.textContent = '正在播放...';
        playButton.disabled = true;
        stopButton.disabled = false;
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      statusDiv.textContent = '播放出错';
    }
  });

  // 停止按钮处理
  stopButton.addEventListener('click', () => {
    try {
      const audioManager = LAppDelegate.getInstance()
        ._subdelegates.at(0)
        .getLive2DManager()
        .getAudioManager();

      audioManager.stop();
      statusDiv.textContent = '已停止';
      playButton.disabled = false;
      stopButton.disabled = true;
    } catch (error) {
      console.error('Error stopping audio:', error);
      statusDiv.textContent = '停止出错';
    }
  });

  // 设置音频管理器回调
  try {
    const audioManager = LAppDelegate.getInstance()
      ._subdelegates.at(0)
      .getLive2DManager()
      .getAudioManager();

    audioManager.setOnPlayCallback(() => {
      statusDiv.textContent = '正在播放...';
      playButton.disabled = true;
      stopButton.disabled = false;
    });

    audioManager.setOnStopCallback(() => {
      statusDiv.textContent = '已停止';
      playButton.disabled = false;
      stopButton.disabled = true;
    });

    audioManager.setOnEndCallback(() => {
      statusDiv.textContent = '播放结束';
    });
  } catch (error) {
    console.error('Error setting up audio callbacks:', error);
  }

  // // 开始录音按钮处理
  // startRecordingButton.addEventListener('click', () => {
  //   (async () => {
  //     try {
  //       const audioManager = LAppDelegate.getInstance()
  //         ._subdelegates.at(0)
  //         .getLive2DManager()
  //         .getAudioManager();
  //
  //       statusDiv.textContent = '正在请求麦克风权限...';
  //
  //       const success = await audioManager.startRecording();
  //
  //       if (success) {
  //         statusDiv.textContent = '正在录音...';
  //         startRecordingButton.disabled = true;
  //         stopRecordingButton.disabled = false;
  //         playButton.disabled = true;
  //         stopButton.disabled = true;
  //       } else {
  //         statusDiv.textContent = '录音启动失败';
  //       }
  //     } catch (error) {
  //       console.error('Error starting recording:', error);
  //       statusDiv.textContent = '录音启动出错';
  //     }
  //   })();
  // });
  //
  // // 停止录音按钮处理
  // stopRecordingButton.addEventListener('click', () => {
  //   try {
  //     const audioManager = LAppDelegate.getInstance()
  //       ._subdelegates.at(0)
  //       .getLive2DManager()
  //       .getAudioManager();
  //
  //     audioManager.stopRecording();
  //     statusDiv.textContent = '录音已停止';
  //     startRecordingButton.disabled = false;
  //     stopRecordingButton.disabled = true;
  //
  //     // 如果有加载的音频文件，恢复播放按钮状态
  //     if (audioManager.isLoaded()) {
  //       playButton.disabled = false;
  //     }
  //   } catch (error) {
  //     console.error('Error stopping recording:', error);
  //     statusDiv.textContent = '停止录音出错';
  //   }
  // });

  // 动画控制按钮处理
  const toggleMotionButton = document.getElementById(
    'toggle-motion'
  ) as HTMLButtonElement;

  if (toggleMotionButton) {
    toggleMotionButton.addEventListener('click', () => {
      try {
        const live2DManager = LAppDelegate.getInstance()
          ._subdelegates.at(0)
          .getLive2DManager();

        live2DManager.toggleMotion();

        // 更新按钮文本
        const model = live2DManager._models.at(0);
        if (model && model.isMotionEnabled()) {
          toggleMotionButton.textContent = '停止循环播放动画';
        } else {
          toggleMotionButton.textContent = '循环播放随机动画';
        }
      } catch (error) {
        console.error('Error toggling motion:', error);
      }
    });
  }

  // 动画控制按钮处理
  const toggleMotionNoButton = document.getElementById(
    'toggle-motion-no'
  ) as HTMLButtonElement;
  const motionNoSelect = document.getElementById(
    'motion-no-select'
  ) as HTMLSelectElement;

  if (toggleMotionNoButton && motionNoSelect) {
    // 初始化选择框选项 - 等待模型初始化完成
    const initMotionSelect = () => {
      try {
        const live2DManager = LAppDelegate.getInstance()
          ._subdelegates.at(0)
          .getLive2DManager();
        const model = live2DManager._models.at(0);

        if (model && model.isInitialized()) {
          // 获取Idle组的动画数量
          const motionCount = model._modelSetting.getMotionCount(
            LAppDefine.MotionGroupIdle
          );

          // 清空现有选项
          motionNoSelect.innerHTML = '';

          // 添加从0开始的选项
          for (let i = 0; i < motionCount; i++) {
            const option = document.createElement('option');
            option.value = i.toString();
            option.textContent = i.toString();
            motionNoSelect.appendChild(option);
          }
        } else {
          // 如果模型还未初始化完成，延迟100ms后重试
          setTimeout(initMotionSelect, 100);
        }
      } catch (error) {
        console.error('Error initializing motion select:', error);
      }
    };

    // 开始初始化
    initMotionSelect();

    // 点击按钮播放指定序号的动画
    toggleMotionNoButton.addEventListener('click', () => {
      try {
        const motionNo = parseInt(motionNoSelect.value, 10);
        const live2DManager = LAppDelegate.getInstance()
          ._subdelegates.at(0)
          .getLive2DManager();

        live2DManager.playMotionByNo(motionNo);

        // 更新按钮文本
        const model = live2DManager._models.at(0);
        if (model && model.isMotionEnabled()) {
          toggleMotionButton.textContent = '停止循环播放动画';
        } else {
          toggleMotionButton.textContent = '循环播放随机动画';
        }
      } catch (error) {
        console.error('Error playing motion by no:', error);
      }
    });
  }
}

/**
 * 初始化WebSocket控制UI
 */
function initializeWebSocketControls(): void {
  const wsManager = WebSocketManager.getInstance();

  const container = document.getElementById(
    'websocket-container'
  ) as HTMLDivElement;
  const statusDot = document.getElementById('status-dot') as HTMLSpanElement;
  const statusText = document.getElementById('status-text') as HTMLSpanElement;
  const statusDiv = document.getElementById(
    'websocket-status'
  ) as HTMLDivElement;
  const messagesDiv = document.getElementById(
    'websocket-messages'
  ) as HTMLDivElement;
  const messageInput = document.getElementById(
    'ws-message-input'
  ) as HTMLInputElement;
  const sendButton = document.getElementById(
    'ws-send-button'
  ) as HTMLButtonElement;

  if (
    !container ||
    !statusDot ||
    !statusText ||
    !statusDiv ||
    !messagesDiv ||
    !messageInput ||
    !sendButton
  ) {
    console.error('WebSocket control elements not found');
    return;
  }

  // 设置状态变化回调
  wsManager.onStateChange((state: ConnectionState) => {
    statusDiv.classList.remove('disconnected', 'connecting');

    switch (state) {
      case 'connected':
        statusDot.style.color = '#4CAF50';
        statusText.textContent = '已连接';
        sendButton.disabled = false;
        break;
      case 'connecting':
        statusDiv.classList.add('connecting');
        statusDot.style.color = '#ff9800';
        statusText.textContent = '连接中...';
        sendButton.disabled = true;
        break;
      case 'disconnected':
        statusDiv.classList.add('disconnected');
        statusDot.style.color = '#f44336';
        statusText.textContent = '未连接';
        sendButton.disabled = true;
        break;
      case 'error':
        statusDiv.classList.add('disconnected');
        statusDot.style.color = '#f44336';
        statusText.textContent = '连接错误';
        sendButton.disabled = true;
        break;
    }
  });

  // 设置消息回调
  wsManager.onMessage((message: Message) => {
    const messageElement = document.createElement('div');
    messageElement.className = `websocket-message ${message.type}`;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = formatTime(message.timestamp);

    messageElement.appendChild(timeSpan);

    // 根据消息内容类型显示不同的内容
    if (message.contentType === 'image') {
      // 图片消息
      const imgElement = document.createElement('img');
      imgElement.src = message.content;
      imgElement.alt = '图片消息';
      imgElement.style.maxWidth = '100%';
      imgElement.style.height = 'auto';
      imgElement.style.borderRadius = '4px';
      imgElement.style.marginTop = '5px';
      messageElement.appendChild(imgElement);
    } else if (message.contentType === 'audio') {
      // 音频消息
      const audioElement = document.createElement('audio');
      audioElement.src = message.content;
      audioElement.controls = true;
      audioElement.style.width = '100%';
      audioElement.style.marginTop = '5px';
      messageElement.appendChild(audioElement);
    } else {
      // 文字消息（默认）- 使用打字机效果显示
      const contentSpan = document.createElement('span');
      contentSpan.className = 'message-content';
      messageElement.appendChild(contentSpan);

      console.log(message.animation_index);

      // 如果是接收到的消息，使用打字机效果并触发随机动画
      if (message.type === 'received') {
        // 如果指定了动画序号，播放指定动画；否则播放随机动画
        if (message.animation_index !== undefined) {
          try {
            const live2DManager = LAppDelegate.getInstance()
              ._subdelegates.at(0)
              .getLive2DManager();
            live2DManager.playMotionByNo(message.animation_index);
          } catch (error) {
            console.error('Error playing motion by index:', error);
            // 如果播放失败，回退到随机动画
            // triggerRandomMotion();
          }
        } else {
          // triggerRandomMotion();
        }
        typeWriterEffect(contentSpan, message.content, 50, () => {
          // 打字结束后停止动画
          stopMotion();
        });
      } else {
        contentSpan.textContent = message.content;
      }
    }

    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });

  // 发送按钮处理
  sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
      // 获取当前Live2D模型名称
      const live2DManager = LAppDelegate.getInstance()
        ._subdelegates.at(0)
        .getLive2DManager();
      const modelName = live2DManager.getCurrentModelName();

      if (wsManager.send({ text: message, model: modelName })) {
        messageInput.value = '';
      }
    }
  });

  // 回车键发送
  messageInput.addEventListener('keypress', (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      sendButton.click();
    }
  });

  // 初始化状态
  statusDiv.classList.add('disconnected');
  sendButton.disabled = true;

  // 自动连接到WebSocket服务器
  // 生成唯一的client_id
  const clientId =
    'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const wsUrl = `ws://47.121.30.160:8000/ws/${clientId}`;
  wsManager.connect(wsUrl);

  // 添加初始提示消息
  const initialMessage = document.createElement('div');
  initialMessage.className = 'websocket-message received';
  initialMessage.style.color = '#888';
  initialMessage.innerHTML = `<span class="message-time">系统</span>WebSocket功能已就绪，客户端ID: ${clientId}`;
  messagesDiv.appendChild(initialMessage);
}

/**
 * 格式化时间
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * 打字机效果显示文字
 * @param element 目标DOM元素
 * @param text 要显示的文字
 * @param speed 打字速度（毫秒）
 * @param onComplete 打字完成时的回调函数
 */
function typeWriterEffect(
  element: HTMLElement,
  text: string,
  speed: number = 50,
  onComplete?: () => void
): void {
  let index = 0;
  element.textContent = '';

  function type(): void {
    if (index < text.length) {
      element.textContent += text.charAt(index);
      index++;
      setTimeout(type, speed);
    } else if (onComplete) {
      // 打字完成时调用回调函数
      onComplete();
    }
  }

  type();
}

/**
 * 触发Live2D随机动画
 */
function triggerRandomMotion(): void {
  try {
    const live2DManager = LAppDelegate.getInstance()
      ._subdelegates.at(0)
      .getLive2DManager();
    const model = live2DManager._models.at(0);
    model.enableMotion();
  } catch (error) {
    console.error('Error triggering random motion:', error);
  }
}

/**
 * 停止Live2D动画
 */
function stopMotion(): void {
  try {
    const live2DManager = LAppDelegate.getInstance()
      ._subdelegates.at(0)
      .getLive2DManager();
    const model = live2DManager._models.at(0);
    model.stopMotion();
  } catch (error) {
    console.error('Error stopping motion:', error);
  }
}
