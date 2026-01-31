/**
 * WebSocket管理器
 * 负责管理WebSocket连接、消息收发和状态管理
 */

// 连接状态
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

// 消息方向类型
export type MessageType = 'received' | 'sent' | 'error' | 'system';

// 协议消息类型
export type ProtocolMessageType = 'text' | 'audio' | 'control' | 'response';

// 控制消息动作类型
export type ControlAction =
  | 'start_audio_stream'
  | 'stop_audio_stream'
  | 'ping'
  | 'pong';

// 音频格式
export type AudioFormat = 'pcm' | 'wav' | 'mp3';

// 协议消息数据接口
export interface ProtocolMessageData {
  // 文本消息数据
  content?: string;

  // 音频消息数据
  format?: AudioFormat;
  sample_rate?: number;
  channels?: number;
  chunk?: string; // base64编码的音频块
  is_final?: boolean;

  // 控制消息数据
  action?: ControlAction;

  // 通用字段
  timestamp?: string;
  client_id?: string;

  // Live2D相关
  model?: string;
  is_audio?: boolean;
}

// 完整的协议消息结构
export interface ProtocolMessage {
  type: ProtocolMessageType;
  data: ProtocolMessageData;
}

// 响应消息数据
export interface ResponseMessageData {
  status: 'success' | 'error';
  message: string;
  request_type: ProtocolMessageType;
  timestamp?: string;
  [key: string]: unknown; // 其他可能的响应字段
}

// 响应消息结构
export interface ResponseMessage {
  type: 'response';
  data: ResponseMessageData;
}

// 显示用消息接口（用于UI展示）
export interface DisplayMessage {
  type: MessageType;
  content: string;
  timestamp: Date;
  protocolType?: ProtocolMessageType; // 协议消息类型
  contentType?: 'text' | 'audio'; // 显示内容类型
  audioUrl?: string; // 音频URL
  isError?: boolean; // 是否为错误消息
}

export class WebSocketManager {
  private static _instance: WebSocketManager | null = null;
  private _ws: WebSocket | null = null;
  private _url: string;
  private _clientId: string;
  private _state: ConnectionState = 'disconnected';
  private _displayMessages: DisplayMessage[] = []; // 用于UI显示的消息
  private _maxMessages: number = 100;
  private _reconnectAttempts: number = 0;
  private _maxReconnectAttempts: number = 5;
  private _reconnectDelay: number = 3000;
  private _reconnectTimer: NodeJS.Timeout | null = null;
  private _messageCallback: ((message: DisplayMessage) => void) | null = null;
  private _stateCallback: ((state: ConnectionState) => void) | null = null;

  private constructor(
    url: string = 'ws://localhost:8000',
    clientId: string = 'user_' + Date.now()
  ) {
    this._url = url;
    this._clientId = clientId;
  }

  public static getInstance(url?: string, clientId?: string): WebSocketManager {
    if (!WebSocketManager._instance) {
      WebSocketManager._instance = new WebSocketManager(url, clientId);
    }
    return WebSocketManager._instance;
  }

  /**
   * 连接WebSocket服务器
   */
  public connect(url?: string): void {
    if (url) {
      this._url = url;
    }

    console.log('[WebSocketManager.connect] 开始连接到:', this._url);
    console.log(
      '[WebSocketManager.connect] 当前 _ws 状态:',
      this._ws ? this._ws.readyState : 'null'
    );

    if (
      this._ws &&
      (this._ws.readyState === WebSocket.CONNECTING ||
        this._ws.readyState === WebSocket.OPEN)
    ) {
      console.log(
        '[WebSocketManager.connect] WebSocket already connected or connecting'
      );
      return;
    }

    // 如果已有连接但状态不是 OPEN，先关闭
    if (this._ws) {
      console.log('[WebSocketManager.connect] 关闭旧的 WebSocket 连接');
      this._ws.close();
      this._ws = null;
    }

    this._setState('connecting');
    this.addDisplayMessage('system', `正在连接到 ${this._url}...`);

    try {
      console.log('[WebSocketManager.connect] 创建 WebSocket 实例');
      this._ws = new WebSocket(this._url);
      console.log(
        '[WebSocketManager.connect] WebSocket 实例已创建, readyState:',
        this._ws.readyState
      );

      this._ws.onopen = () => {
        console.log('[WebSocketManager.onopen] WebSocket 连接成功');
        console.log('[WebSocketManager.onopen] _ws 存在:', !!this._ws);
        console.log(
          '[WebSocketManager.onopen] _ws.readyState:',
          this._ws?.readyState
        );
        console.log('[WebSocketManager.onopen] _url:', this._url);
        this._setState('connected');
        this._reconnectAttempts = 0;
        this.addDisplayMessage('system', 'WebSocket连接成功');
      };

      this._ws.onmessage = (event: MessageEvent) => {
        try {
          // 尝试解析JSON格式的消息
          const parsedData = JSON.parse(event.data as string) as {
            type?: number;
            content?: unknown;
            animation_index?: number;
            audio?: string;
          };

          // 根据type字段确定内容类型
          let contentType: 'text' | 'audio' = 'text';
          if (parsedData.type === 3) {
            contentType = 'audio';
          }

          const message: DisplayMessage = {
            type: 'received',
            content:
              typeof parsedData.content === 'string'
                ? parsedData.content
                : typeof parsedData.content === 'object' &&
                    parsedData.content !== null
                  ? JSON.stringify(parsedData.content)
                  : typeof parsedData.content === 'number' ||
                      typeof parsedData.content === 'boolean'
                    ? String(parsedData.content)
                    : '',
            timestamp: new Date(),
            contentType: contentType,
            audioUrl: parsedData.audio
          };
          this._displayMessages.push(message);
          if (this._displayMessages.length > this._maxMessages) {
            this._displayMessages.shift();
          }
          if (this._messageCallback) {
            this._messageCallback(message);
          }
        } catch (error) {
          // 如果不是JSON格式，按纯文本处理
          console.warn(
            'Failed to parse message as JSON, treating as plain text:',
            error
          );
          const message: DisplayMessage = {
            type: 'received',
            content:
              typeof event.data === 'string' ? event.data : String(event.data),
            timestamp: new Date(),
            contentType: 'text'
          };
          this._displayMessages.push(message);
          if (this._displayMessages.length > this._maxMessages) {
            this._displayMessages.shift();
          }
          if (this._messageCallback) {
            this._messageCallback(message);
          }
        }
      };

      this._ws.onerror = (error: Event) => {
        console.error('[WebSocketManager.onerror] WebSocket error:', error);
        console.error('[WebSocketManager.onerror] _url:', this._url);
        console.error(
          '[WebSocketManager.onerror] _ws.readyState:',
          this._ws?.readyState
        );
        this._setState('error');
        this.addDisplayMessage('error', 'WebSocket连接错误');
      };

      this._ws.onclose = (event: CloseEvent) => {
        console.log(
          '[WebSocketManager.onclose] WebSocket 连接关闭:',
          event.code,
          event.reason
        );
        console.log(
          '[WebSocketManager.onclose] 关闭前 _ws.readyState:',
          this._ws?.readyState
        );
        console.log('[WebSocketManager.onclose] _url:', this._url);
        this._setState('disconnected');
        this.addDisplayMessage(
          'system',
          `WebSocket连接关闭: ${event.code} - ${event.reason || '未知原因'}`
        );

        // 注意：不要在这里立即设置 _ws = null，因为可能需要检查状态
        // _ws 会在下次 connect 时被清理

        // 自动重连
        if (this._reconnectAttempts < this._maxReconnectAttempts) {
          this._reconnectAttempts++;
          this.addDisplayMessage(
            'system',
            `${this._reconnectDelay / 1000}秒后尝试第${this._reconnectAttempts}次重连...`
          );

          this._reconnectTimer = setTimeout(() => {
            console.log('[WebSocketManager.onclose] 开始重连...');
            this.connect();
          }, this._reconnectDelay);
        } else {
          this.addDisplayMessage('error', '已达到最大重连次数，停止重连');
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this._setState('error');
      this.addDisplayMessage(
        'error',
        `连接失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 断开WebSocket连接
   */
  public disconnect(): void {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }

    this._setState('disconnected');
    this._reconnectAttempts = 0;
    this.addDisplayMessage('system', 'WebSocket连接已断开');
  }

  /**
   * 发送结构化数据（JSON格式）
   * @param data 要发送的数据对象
   * @returns 发送是否成功
   */
  public send(
    data:
      | {
          text?: string; // 文字内容
          img?: string; // 图片内容（base64）
          audio?: string; // 音频内容（base64）
          model?: string; // Live2D模型名称（如：Hiyori、Haru、Rice等）
          isAudio?: boolean; // 是否需要语音回复
        }
      | ProtocolMessage
  ): boolean {
    console.log('[WebSocketManager.send] 开始发送消息');
    console.log('[WebSocketManager.send] _ws 存在:', !!this._ws);
    console.log(
      '[WebSocketManager.send] _ws.readyState:',
      this._ws?.readyState
    );
    console.log('[WebSocketManager.send] readyState 值:', this._ws?.readyState);
    console.log('[WebSocketManager.send] WebSocket.OPEN:', WebSocket.OPEN);
    console.log('[WebSocketManager.send] _state:', this._state);
    console.log('[WebSocketManager.send] _url:', this._url);

    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
      console.error('[WebSocketManager.send] WebSocket 未连接或未就绪');
      console.error('[WebSocketManager.send] _ws 为空:', !this._ws);
      console.error(
        '[WebSocketManager.send] readyState 不匹配:',
        this._ws?.readyState,
        '!==',
        WebSocket.OPEN
      );
      this.addDisplayMessage('error', '未连接到服务器，无法发送消息');
      return false;
    }

    try {
      // 检查是否为协议格式消息
      let jsonString: string;
      if ('type' in data && 'data' in data) {
        // 协议格式消息
        jsonString = JSON.stringify(data);
      } else {
        // 旧格式消息，转换为协议格式
        const protocolData: ProtocolMessageData = {};
        if (data.text) protocolData.content = data.text;
        if (data.audio) protocolData.chunk = data.audio;
        if (data.model) protocolData.model = data.model;
        if (data.isAudio !== undefined) protocolData.is_audio = data.isAudio;
        protocolData.timestamp = new Date().toISOString();
        protocolData.client_id = this._clientId;

        const protocolMessage: ProtocolMessage = {
          type: data.audio ? 'audio' : 'text',
          data: protocolData
        };
        jsonString = JSON.stringify(protocolMessage);
      }

      console.log('[WebSocketManager.send] 发送数据:', jsonString);
      this._ws.send(jsonString);
      const msg: DisplayMessage = {
        type: 'sent',
        content: ('text' in data ? data.text : '') || '', // 只保存文字内容用于显示
        timestamp: new Date(),
        contentType: 'text'
      };
      this._displayMessages.push(msg);
      if (this._displayMessages.length > this._maxMessages) {
        this._displayMessages.shift();
      }
      if (this._messageCallback) {
        this._messageCallback(msg);
      }
      console.log('[WebSocketManager.send] 发送成功');
      return true;
    } catch (error) {
      console.error('[WebSocketManager.send] 发送失败:', error);
      this.addDisplayMessage(
        'error',
        `发送失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
      return false;
    }
  }

  /**
   * 获取连接状态
   */
  public getState(): ConnectionState {
    return this._state;
  }

  /**
   * 获取客户端ID
   */
  public getClientId(): string {
    return this._clientId;
  }

  /**
   * 设置客户端ID
   */
  public setClientId(clientId: string): void {
    this._clientId = clientId;
  }

  /**
   * 获取所有显示消息
   */
  public getMessages(): DisplayMessage[] {
    return [...this._displayMessages];
  }

  /**
   * 清空消息
   */
  public clearMessages(): void {
    this._displayMessages = [];
  }

  /**
   * 设置消息回调
   */
  public onMessage(callback: (message: DisplayMessage) => void): void {
    this._messageCallback = callback;
  }

  /**
   * 设置状态变化回调
   */
  public onStateChange(callback: (state: ConnectionState) => void): void {
    this._stateCallback = callback;
  }

  /**
   * 设置连接URL
   */
  public setUrl(url: string): void {
    this._url = url;
  }

  /**
   * 获取连接URL
   */
  public getUrl(): string {
    return this._url;
  }

  /**
   * 设置最大重连次数
   */
  public setMaxReconnectAttempts(attempts: number): void {
    this._maxReconnectAttempts = attempts;
  }

  /**
   * 设置重连延迟
   */
  public setReconnectDelay(delay: number): void {
    this._reconnectDelay = delay;
  }

  /**
   * 添加显示消息
   */
  private addDisplayMessage(
    type: MessageType,
    content: string,
    contentType?: 'text' | 'audio',
    isError: boolean = false
  ): void {
    const message: DisplayMessage = {
      type,
      content,
      timestamp: new Date(),
      contentType,
      isError
    };

    this._displayMessages.push(message);
    if (this._displayMessages.length > this._maxMessages) {
      this._displayMessages.shift();
    }

    if (this._messageCallback) {
      this._messageCallback(message);
    }
  }

  /**
   * 设置状态
   */
  private _setState(state: ConnectionState): void {
    this._state = state;
    if (this._stateCallback) {
      this._stateCallback(state);
    }
  }

  /**
   * 释放实例
   */
  public static releaseInstance(): void {
    if (WebSocketManager._instance) {
      WebSocketManager._instance.disconnect();
      WebSocketManager._instance = null;
    }
  }
}
