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

    // 将Live2D画布移动到指定容器
    moveCanvasToContainer();

    // 初始化手机端UI
    initializeMobileUI();

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
 * 初始化手机端UI
 */
function initializeMobileUI(): void {
  // 初始化WebSocket连接
  initializeWebSocket();

  // 初始化动画控制面板
  initializeMotionControls();

  // 初始化聊天输入
  initializeChatInput();
}

/**
 * 初始化WebSocket连接
 */
function initializeWebSocket(): void {
  const wsManager = WebSocketManager.getInstance();

  const statusDot = document.getElementById('status-dot') as HTMLSpanElement;
  const statusText = document.getElementById('status-text') as HTMLSpanElement;
  const messagesDiv = document.getElementById(
    'chat-messages'
  ) as HTMLDivElement;
  const chatInput = document.getElementById('chat-input') as HTMLInputElement;
  const sendButton = document.getElementById(
    'send-button'
  ) as HTMLButtonElement;

  if (!statusDot || !statusText || !messagesDiv || !chatInput || !sendButton) {
    console.error('Chat elements not found');
    return;
  }

  // 自动连接到WebSocket服务器
  // 生成唯一的client_id
  const clientId =
    'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const wsUrl = `ws://47.121.30.160:8000/ws/${clientId}`;
  wsManager.connect(wsUrl);

  console.log('正在连接到WebSocket服务器:', wsUrl);

  // 更新连接状态
  wsManager.onStateChange((state: ConnectionState): void => {
    switch (state) {
      case 'connected':
        statusDot.classList.add('connected');
        statusDot.classList.remove('connecting');
        statusText.textContent = '已连接';
        break;
      case 'connecting':
        statusDot.classList.add('connecting');
        statusDot.classList.remove('connected');
        statusText.textContent = '连接中...';
        break;
      case 'disconnected':
        statusDot.classList.remove('connected', 'connecting');
        statusText.textContent = '未连接';
        break;
      case 'error':
        statusDot.classList.remove('connected', 'connecting');
        statusText.textContent = '连接错误';
        break;
    }
  });

  // 接收消息
  wsManager.onMessage((message: Message): void => {
    addChatMessage(
      message.content,
      'received',
      message.timestamp.toISOString()
    );
  });

  // 发送消息
  const sendMessage = (): void => {
    const content = chatInput.value.trim();
    if (!content) {
      return;
    }

    // 显示发送的消息
    addChatMessage(content, 'sent', new Date().toISOString());

    // 发送到WebSocket服务器
    wsManager.send({
      text: content
    });

    // 清空输入框
    chatInput.value = '';
  };

  sendButton.addEventListener('click', (): void => {
    sendMessage();
  });

  chatInput.addEventListener('keypress', (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  });

  // 自动滚动到底部
  const scrollToBottom = (): void => {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  // 添加消息到聊天区域
  function addChatMessage(
    content: string,
    type: 'received' | 'sent' | 'error',
    timestamp?: string
  ): void {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;

    const contentDiv = document.createElement('div');
    contentDiv.textContent = content;
    messageDiv.appendChild(contentDiv);

    if (timestamp) {
      const timeDiv = document.createElement('div');
      timeDiv.className = 'message-time';
      const date = new Date(timestamp);
      timeDiv.textContent = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      messageDiv.appendChild(timeDiv);
    }

    messagesDiv.appendChild(messageDiv);
    scrollToBottom();
  }
}

/**
 * 初始化动画控制面板
 */
function initializeMotionControls(): void {
  const toggleButton = document.getElementById(
    'toggle-motion-panel'
  ) as HTMLButtonElement;
  const motionControls = document.getElementById(
    'motion-controls'
  ) as HTMLDivElement;
  const motionButtons = document.getElementById(
    'motion-buttons'
  ) as HTMLDivElement;

  if (!toggleButton || !motionControls || !motionButtons) {
    console.error('Motion control elements not found');
    return;
  }

  // 切换动画面板显示/隐藏
  toggleButton.addEventListener('click', (): void => {
    motionControls.classList.toggle('show');
    toggleButton.textContent = motionControls.classList.contains('show')
      ? '关闭动画'
      : '动画控制';
  });

  // 初始化动画按钮
  const initMotionButtons = (): void => {
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

        // 清空现有按钮
        motionButtons.innerHTML = '';

        // 创建动画按钮
        for (let i = 0; i < motionCount; i++) {
          const button = document.createElement('button');
          button.className = 'motion-button';
          button.textContent = `动画 ${i}`;
          button.dataset.motionNo = i.toString();

          button.addEventListener('click', (): void => {
            // 移除其他按钮的playing状态
            motionButtons.querySelectorAll('.motion-button').forEach(btn => {
              btn.classList.remove('playing');
            });

            // 添加当前按钮的playing状态
            button.classList.add('playing');

            // 播放指定动画
            live2DManager.playMotionByNo(i);

            // 3秒后移除playing状态
            setTimeout(() => {
              button.classList.remove('playing');
            }, 3000);
          });

          motionButtons.appendChild(button);
        }
      } else {
        // 如果模型还未初始化完成，延迟100ms后重试
        setTimeout(initMotionButtons, 100);
      }
    } catch (error) {
      console.error('Error initializing motion buttons:', error as Error);
    }
  };

  // 开始初始化
  initMotionButtons();
}

/**
 * 将Live2D画布移动到指定容器
 */
function moveCanvasToContainer(): void {
  const container = document.getElementById(
    'live2d-container'
  ) as HTMLDivElement;
  if (!container) {
    console.error('Live2D container not found');
    return;
  }

  // 获取LAppDelegate创建的所有canvas
  const appDelegate = LAppDelegate.getInstance();
  const canvases = document.querySelectorAll('body > canvas');

  // 将所有canvas移动到容器中
  canvases.forEach((canvas: HTMLCanvasElement) => {
    // 重置canvas样式以适应容器
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    container.appendChild(canvas);
  });
}

/**
 * 初始化聊天输入
 */
function initializeChatInput(): void {
  const chatInput = document.getElementById('chat-input') as HTMLInputElement;
  const sendButton = document.getElementById(
    'send-button'
  ) as HTMLButtonElement;
  const messagesDiv = document.getElementById(
    'chat-messages'
  ) as HTMLDivElement;

  if (!chatInput || !sendButton || !messagesDiv) {
    console.error('Chat input elements not found');
    return;
  }

  const wsManager = WebSocketManager.getInstance();

  // 发送消息
  const sendMessage = (): void => {
    const content = chatInput.value.trim();
    if (!content) {
      return;
    }

    // 显示发送的消息
    addChatMessage(content, 'sent', new Date().toISOString());

    // 发送到WebSocket服务器
    wsManager.send({
      text: content
    });

    // 清空输入框
    chatInput.value = '';
  };

  // 点击发送按钮
  sendButton.addEventListener('click', (): void => {
    sendMessage();
  });

  // 按回车键发送
  chatInput.addEventListener('keypress', (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  });

  // 输入框获得焦点时，隐藏动画控制面板
  chatInput.addEventListener('focus', (): void => {
    const motionControls = document.getElementById(
      'motion-controls'
    ) as HTMLDivElement;
    const toggleButton = document.getElementById(
      'toggle-motion-panel'
    ) as HTMLButtonElement;

    if (motionControls && toggleButton) {
      motionControls.classList.remove('show');
      toggleButton.textContent = '动画控制';
    }
  });

  // 自动滚动到底部
  const scrollToBottom = (): void => {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  // 添加消息到聊天区域
  function addChatMessage(
    content: string,
    type: 'received' | 'sent' | 'error',
    timestamp?: string
  ): void {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;

    const contentDiv = document.createElement('div');
    contentDiv.textContent = content;
    messageDiv.appendChild(contentDiv);

    if (timestamp) {
      const timeDiv = document.createElement('div');
      timeDiv.className = 'message-time';
      const date = new Date(timestamp);
      timeDiv.textContent = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      messageDiv.appendChild(timeDiv);
    }

    messagesDiv.appendChild(messageDiv);
    scrollToBottom();
  }
}
