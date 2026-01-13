/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

/**
 * 音频管理器类
 * 处理音频文件的加载、播放和RMS值计算，用于Live2D模型的口型同步
 */
export class LAppAudioManager {
  private _audioContext: AudioContext;
  private _audioBuffer: AudioBuffer | null;
  private _audioSource: AudioBufferSourceNode | null;
  private _analyser: AnalyserNode;
  private _isPlaying: boolean;
  private _startTime: number;
  private _pauseTime: number;
  private _onPlayCallback: (() => void) | null;
  private _onStopCallback: (() => void) | null;
  private _onEndCallback: (() => void) | null;
  private _mediaStream: MediaStream | null;
  private _mediaStreamSource: MediaStreamAudioSourceNode | null;
  private _isRecording: boolean;

  constructor() {
    this._audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    this._audioBuffer = null;
    this._audioSource = null;
    this._analyser = this._audioContext.createAnalyser();
    this._analyser.fftSize = 2048;
    this._isPlaying = false;
    this._startTime = 0;
    this._pauseTime = 0;
    this._onPlayCallback = null;
    this._onStopCallback = null;
    this._onEndCallback = null;
    this._mediaStream = null;
    this._mediaStreamSource = null;
    this._isRecording = false;
  }

  /**
   * 从文件加载音频
   * @param file 音频文件
   * @returns Promise<boolean> 加载是否成功
   */
  public async loadAudioFromFile(file: File): Promise<boolean> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      this._audioBuffer = await this._audioContext.decodeAudioData(arrayBuffer);
      return true;
    } catch (error) {
      console.error('Failed to load audio file:', error);
      return false;
    }
  }

  /**
   * 从ArrayBuffer加载音频
   * @param arrayBuffer 音频数据
   * @returns Promise<boolean> 加载是否成功
   */
  public async loadAudioFromArrayBuffer(
    arrayBuffer: ArrayBuffer
  ): Promise<boolean> {
    try {
      this._audioBuffer = await this._audioContext.decodeAudioData(arrayBuffer);
      return true;
    } catch (error) {
      console.error('Failed to load audio from ArrayBuffer:', error);
      return false;
    }
  }

  /**
   * 播放音频
   */
  public play(): void {
    if (!this._audioBuffer) {
      console.warn('No audio buffer loaded');
      return;
    }

    if (this._isPlaying) {
      this.stop();
    }

    this._audioSource = this._audioContext.createBufferSource();
    this._audioSource.buffer = this._audioBuffer;
    this._audioSource.connect(this._analyser);
    this._analyser.connect(this._audioContext.destination);

    this._audioSource.onended = () => {
      this._isPlaying = false;
      if (this._onEndCallback) {
        this._onEndCallback();
      }
    };

    this._startTime = this._audioContext.currentTime - this._pauseTime;
    this._audioSource.start(0, this._pauseTime);
    this._isPlaying = true;

    if (this._onPlayCallback) {
      this._onPlayCallback();
    }
  }

  /**
   * 停止音频
   */
  public stop(): void {
    if (this._audioSource) {
      try {
        this._audioSource.stop();
      } catch (e) {
        // 音频可能已经停止
      }
      this._audioSource = null;
    }
    this._isPlaying = false;
    this._pauseTime = 0;

    if (this._onStopCallback) {
      this._onStopCallback();
    }
  }

  /**
   * 获取当前RMS值（均方根值），用于口型同步
   * @returns RMS值（0-1范围）
   */
  public getRms(): number {
    if (!this._isPlaying || !this._audioBuffer) {
      return 0.0;
    }

    const bufferLength = this._analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this._analyser.getByteTimeDomainData(dataArray);

    // 计算RMS值
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const x = (dataArray[i] - 128) / 128.0;
      sum += x * x;
    }
    const rms = Math.sqrt(sum / bufferLength);

    // 放大RMS值以获得更好的口型效果
    return Math.min(rms * 5.0, 1.0);
  }

  /**
   * 获取音频时长（秒）
   * @returns 音频时长
   */
  public getDuration(): number {
    return this._audioBuffer ? this._audioBuffer.duration : 0;
  }

  /**
   * 获取当前播放时间（秒）
   * @returns 当前播放时间
   */
  public getCurrentTime(): number {
    if (!this._isPlaying) {
      return this._pauseTime;
    }
    return this._audioContext.currentTime - this._startTime;
  }

  /**
   * 检查是否正在播放
   * @returns 是否正在播放
   */
  public isPlaying(): boolean {
    return this._isPlaying;
  }

  /**
   * 检查是否已加载音频
   * @returns 是否已加载音频
   */
  public isLoaded(): boolean {
    return this._audioBuffer !== null;
  }

  /**
   * 设置播放回调
   * @param callback 播放时调用的回调函数
   */
  public setOnPlayCallback(callback: () => void): void {
    this._onPlayCallback = callback;
  }

  /**
   * 设置停止回调
   * @param callback 停止时调用的回调函数
   */
  public setOnStopCallback(callback: () => void): void {
    this._onStopCallback = callback;
  }

  /**
   * 设置播放结束回调
   * @param callback 播放结束时调用的回调函数
   */
  public setOnEndCallback(callback: () => void): void {
    this._onEndCallback = callback;
  }

  /**
   * 释放资源
   */
  public release(): void {
    this.stop();
    this.stopRecording();
    this._audioBuffer = null;
    if (this._audioContext.state !== 'closed') {
      this._audioContext.close();
    }
  }

  /**
   * 开始麦克风录音
   * @returns Promise<boolean> 录音是否成功启动
   */
  public async startRecording(): Promise<boolean> {
    try {
      // 如果正在播放音频，先停止
      if (this._isPlaying) {
        this.stop();
      }

      // 获取麦克风权限
      this._mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      // 创建媒体流源节点
      this._mediaStreamSource = this._audioContext.createMediaStreamSource(
        this._mediaStream
      );

      // 连接到分析器（不连接到destination，避免听到自己的声音）
      this._mediaStreamSource.connect(this._analyser);

      this._isRecording = true;
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }

  /**
   * 停止麦克风录音
   */
  public stopRecording(): void {
    if (this._mediaStreamSource) {
      this._mediaStreamSource.disconnect();
      this._mediaStreamSource = null;
    }

    if (this._mediaStream) {
      this._mediaStream.getTracks().forEach(track => track.stop());
      this._mediaStream = null;
    }

    this._isRecording = false;
  }

  /**
   * 检查是否正在录音
   * @returns 是否正在录音
   */
  public isRecording(): boolean {
    return this._isRecording;
  }

  /**
   * 获取录音时的RMS值（均方根值），用于口型同步
   * @returns RMS值（0-1范围）
   */
  public getRecordingRms(): number {
    if (!this._isRecording) {
      return 0.0;
    }

    const bufferLength = this._analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this._analyser.getByteTimeDomainData(dataArray);

    // 计算RMS值
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const x = (dataArray[i] - 128) / 128.0;
      sum += x * x;
    }
    const rms = Math.sqrt(sum / bufferLength);

    // 放大RMS值以获得更好的口型效果
    return Math.min(rms * 5.0, 1.0);
  }
}
