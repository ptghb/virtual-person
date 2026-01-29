/**
 * 手势识别服务类
 * 使用 MediaPipe Hands 实现手势识别和手指状态检测
 */

import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export interface FingerState {
  thumb: boolean;      // 拇指
  index: boolean;      // 食指
  middle: boolean;     // 中指
  ring: boolean;       // 无名指
  little: boolean;     // 小指
}

export interface HandGesture {
  leftHand: FingerState | null;
  rightHand: FingerState | null;
}

export type GestureCallback = (gesture: HandGesture) => void;

export class HandGestureService {
  private hands: Hands | null = null;
  private camera: Camera | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  private callbacks: GestureCallback[] = [];

  /**
   * 初始化手势识别服务
   */
  public async initialize(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement
  ): Promise<void> {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;

    return new Promise((resolve, reject) => {
      try {
        this.hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        this.hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5
        });

        this.hands.onResults(this.onResults.bind(this));

        this.camera = new Camera(videoElement, {
          onFrame: async () => {
            if (this.hands && this.isRunning) {
              await this.hands.send({ image: videoElement });
            }
          },
          width: 640,
          height: 480
        });

        this.isInitialized = true;
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 开始手势识别
   */
  public async start(): Promise<void> {
    if (!this.isInitialized || !this.camera) {
      throw new Error('HandGestureService not initialized');
    }

    this.isRunning = true;
    await this.camera.start();
  }

  /**
   * 停止手势识别
   */
  public stop(): void {
    this.isRunning = false;
    if (this.camera) {
      this.camera.stop();
    }
  }

  /**
   * 添加手势回调函数
   */
  public onGesture(callback: GestureCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * 移除手势回调函数
   */
  public removeGestureCallback(callback: GestureCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * 处理 MediaPipe Hands 结果
   */
  private onResults(results: Results): void {
    const ctx = this.canvasElement?.getContext('2d');
    if (!ctx || !this.canvasElement) return;

    ctx.save();
    ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    ctx.drawImage(
      results.image,
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height
    );

    const gesture: HandGesture = {
      leftHand: null,
      rightHand: null
    };

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness[i];

        // 绘制手部关键点
        this.drawHand(ctx, landmarks);

        // 检测手指状态
        const fingerState = this.detectFingerState(landmarks);

        // 根据左右手分类
        if (handedness.label === 'Left') {
          gesture.leftHand = fingerState;
        } else {
          gesture.rightHand = fingerState;
        }
      }
    }

    ctx.restore();

    // 触发回调
    this.callbacks.forEach(callback => callback(gesture));
  }

  /**
   * 绘制手部关键点
   */
  private drawHand(
    ctx: CanvasRenderingContext2D,
    landmarks: any[]
  ): void {
    // 绘制连接线
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // 拇指
      [0, 5], [5, 6], [6, 7], [7, 8], // 食指
      [0, 9], [9, 10], [10, 11], [11, 12], // 中指
      [0, 13], [13, 14], [14, 15], [15, 16], // 无名指
      [0, 17], [17, 18], [18, 19], [19, 20], // 小指
      [5, 9], [9, 13], [13, 17] // 手掌
    ];

    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;

    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];

      ctx.beginPath();
      ctx.moveTo(
        startPoint.x * this.canvasElement!.width,
        startPoint.y * this.canvasElement!.height
      );
      ctx.lineTo(
        endPoint.x * this.canvasElement!.width,
        endPoint.y * this.canvasElement!.height
      );
      ctx.stroke();
    });

    // 绘制关键点
    ctx.fillStyle = '#FF0000';
    landmarks.forEach((landmark) => {
      ctx.beginPath();
      ctx.arc(
        landmark.x * this.canvasElement!.width,
        landmark.y * this.canvasElement!.height,
        5,
        0,
        2 * Math.PI
      );
      ctx.fill();
    });
  }

  /**
   * 检测手指状态（是否伸出）
   */
  private detectFingerState(landmarks: any[]): FingerState {
    // 手指关键点索引
    // 拇指: 4 (指尖), 3 (第二关节), 2 (第一关节), 1 (根部)
    // 其他手指: 8, 12, 16, 20 (指尖), 6, 10, 14, 18 (第二关节), 5, 9, 13, 17 (第一关节)

    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const thumbMCP = landmarks[2];

    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const indexMCP = landmarks[5];

    const middleTip = landmarks[12];
    const middlePIP = landmarks[10];
    const middleMCP = landmarks[9];

    const ringTip = landmarks[16];
    const ringPIP = landmarks[14];
    const ringMCP = landmarks[13];

    const littleTip = landmarks[20];
    const littlePIP = landmarks[18];
    const littleMCP = landmarks[17];

    // 检测拇指（需要特殊处理，因为拇指的运动方向不同）
    const thumbExtended = thumbTip.x < thumbIP.x;

    // 检测其他手指（指尖是否高于第二关节）
    const indexExtended = indexTip.y < indexPIP.y;
    const middleExtended = middleTip.y < middlePIP.y;
    const ringExtended = ringTip.y < ringPIP.y;
    const littleExtended = littleTip.y < littlePIP.y;

    return {
      thumb: thumbExtended,
      index: indexExtended,
      middle: middleExtended,
      ring: ringExtended,
      little: littleExtended
    };
  }

  /**
   * 检查是否已初始化
   */
  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 检查是否正在运行
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 释放资源
   */
  public dispose(): void {
    this.stop();
    this.callbacks = [];
    this.hands = null;
    this.camera = null;
    this.videoElement = null;
    this.canvasElement = null;
    this.isInitialized = false;
  }
}

// 导出单例
export const handGestureService = new HandGestureService();
