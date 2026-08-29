import { Camera } from '@mediapipe/camera_utils';
import { Hands, Results } from '@mediapipe/hands';

export type HandSide = 'left' | 'right';

export interface TrackedHand {
  side: HandSide;
  position: { x: number; y: number };
  confidence: number;
}

export interface HandGesture {
  leftHand: TrackedHand | null;
  rightHand: TrackedHand | null;
}

export type GestureCallback = (gesture: HandGesture) => void;

/**
 * MediaPipe Hands 摄像头识别服务。
 * MediaPipe handedness 默认以镜像自拍画面为输入，而识别器收到的是摄像头
 * 原始画面，因此这里交换 Left/Right，保证界面显示用户真实的左右手。
 */
export class HandGestureService {
  private hands: Hands | null = null;
  private camera: Camera | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private initialized = false;
  private running = false;
  private callbacks = new Set<GestureCallback>();

  public async initialize(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement
  ): Promise<void> {
    if (
      this.initialized &&
      this.videoElement === videoElement &&
      this.canvasElement === canvasElement
    ) {
      return;
    }

    this.dispose();
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;

    const hands = new Hands({
      locateFile: file => `/mediapipe/hands/${file}`
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.65,
      minTrackingConfidence: 0.55
    });
    hands.onResults((results: Results) => this.handleResults(results));

    this.hands = hands;
    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        if (this.hands && this.running && this.videoElement) {
          await this.hands.send({ image: this.videoElement });
        }
      },
      width: 640,
      height: 480
    });
    this.initialized = true;
  }

  public async start(): Promise<void> {
    if (!this.initialized || !this.camera) {
      throw new Error('手势识别服务尚未初始化');
    }
    if (this.running) return;
    this.running = true;
    try {
      await this.camera.start();
    } catch (error) {
      this.running = false;
      throw error;
    }
  }

  public stop(): void {
    this.running = false;
    this.camera?.stop();
    this.emit({ leftHand: null, rightHand: null });
    const context = this.canvasElement?.getContext('2d');
    if (context && this.canvasElement) {
      context.clearRect(
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );
    }
  }

  public onGesture(callback: GestureCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  public dispose(): void {
    this.stop();
    this.hands?.close();
    this.hands = null;
    this.camera = null;
    this.videoElement = null;
    this.canvasElement = null;
    this.initialized = false;
  }

  private handleResults(results: Results): void {
    this.drawPreview(results);

    const gesture: HandGesture = {
      leftHand: null,
      rightHand: null
    };

    if (results.multiHandLandmarks && results.multiHandedness) {
      results.multiHandLandmarks.forEach((landmarks, index) => {
        const handedness = results.multiHandedness[index];
        if (!handedness || !landmarks[8]) return;

        const side: HandSide =
          handedness.label === 'Left' ? 'right' : 'left';
        const trackedHand: TrackedHand = {
          side,
          position: {
            x: landmarks[8].x,
            y: landmarks[8].y
          },
          confidence: handedness.score ?? 1
        };

        if (side === 'left') {
          gesture.leftHand = trackedHand;
        } else {
          gesture.rightHand = trackedHand;
        }
      });
    }

    this.emit(gesture);
  }

  private drawPreview(results: Results): void {
    const canvas = this.canvasElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.save();
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    results.multiHandLandmarks?.forEach(landmarks => {
      context.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      context.fillStyle = '#e96d98';
      context.lineWidth = 3;

      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [5, 9], [9, 10], [10, 11], [11, 12],
        [9, 13], [13, 14], [14, 15], [15, 16],
        [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]
      ];

      connections.forEach(([from, to]) => {
        context.beginPath();
        context.moveTo(
          landmarks[from].x * canvas.width,
          landmarks[from].y * canvas.height
        );
        context.lineTo(
          landmarks[to].x * canvas.width,
          landmarks[to].y * canvas.height
        );
        context.stroke();
      });

      landmarks.forEach(landmark => {
        context.beginPath();
        context.arc(
          landmark.x * canvas.width,
          landmark.y * canvas.height,
          4,
          0,
          Math.PI * 2
        );
        context.fill();
      });
    });
    context.restore();
  }

  private emit(gesture: HandGesture): void {
    this.callbacks.forEach(callback => callback(gesture));
  }
}

export const HandGestureServiceInstance = new HandGestureService();
