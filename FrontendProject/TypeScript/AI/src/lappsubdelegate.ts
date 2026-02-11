/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import * as LAppDefine from './lappdefine';
import { LAppGlManager } from './lappglmanager';
import { LAppLive2DManager } from './lapplive2dmanager';
import { LAppPal } from './lapppal';
import { LAppTextureManager } from './lapptexturemanager';
import { LAppView } from './lappview';

/**
 * 汇总与 Canvas 相关操作的类
 */
export class LAppSubdelegate {
  /**
   * 构造函数
   */
  public constructor() {
    this._canvas = null;
    this._glManager = new LAppGlManager();
    this._textureManager = new LAppTextureManager();
    this._live2dManager = new LAppLive2DManager();
    this._view = new LAppView();
    this._frameBuffer = null;
    this._captured = false;
  }

  /**
   * 相当于析构函数的处理
   */
  public release(): void {
    this._resizeObserver.unobserve(this._canvas);
    this._resizeObserver.disconnect();
    this._resizeObserver = null;

    this._live2dManager.release();
    this._live2dManager = null;

    this._view.release();
    this._view = null;

    this._textureManager.release();
    this._textureManager = null;

    this._glManager.release();
    this._glManager = null;
  }

  /**
   * 初始化应用程序所需的内容。
   */
  public initialize(canvas: HTMLCanvasElement): boolean {
    if (!this._glManager.initialize(canvas)) {
      return false;
    }

    this._canvas = canvas;

    if (LAppDefine.CanvasSize === 'auto') {
      this.resizeCanvas();
    } else {
      canvas.width = LAppDefine.CanvasSize.width;
      canvas.height = LAppDefine.CanvasSize.height;
    }

    this._textureManager.setGlManager(this._glManager);

    const gl = this._glManager.getGl();

    if (!this._frameBuffer) {
      this._frameBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    }

    // 透明度设置
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // 初始化 AppView
    this._view.initialize(this);
    this._view.initializeSprite();

    this._live2dManager.initialize(this);

    this._resizeObserver = new ResizeObserver(
      (entries: ResizeObserverEntry[], observer: ResizeObserver) =>
        this.resizeObserverCallback.call(this, entries, observer)
    );
    this._resizeObserver.observe(this._canvas);

    return true;
  }

  /**
   * Resize canvas and re-initialize view.
   */
  public onResize(): void {
    this.resizeCanvas();
    this._view.initialize(this);
    this._view.initializeSprite();
  }

  private resizeObserverCallback(
    entries: ResizeObserverEntry[],
    observer: ResizeObserver
  ): void {
    if (LAppDefine.CanvasSize === 'auto') {
      this._needResize = true;
    }
  }

  /**
   * 循环处理
   */
  public update(): void {
    if (this._glManager.getGl().isContextLost()) {
      return;
    }

    // 如果画布尺寸发生变化，则进行必要的调整处理。
    if (this._needResize) {
      this.onResize();
      this._needResize = false;
    }

    const gl = this._glManager.getGl();

    // 屏幕初始化
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // 启用深度测试
    gl.enable(gl.DEPTH_TEST);

    // 近处的物体遮挡远处的物体
    gl.depthFunc(gl.LEQUAL);

    // 清除颜色缓冲区和深度缓冲区
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearDepth(1.0);

    // 透明度设置
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // 绘制更新
    this._view.render();
  }

  /**
   * 注册着色器。
   */
  public createShader(): WebGLProgram {
    const gl = this._glManager.getGl();

    // 编译顶点着色器
    const vertexShaderId = gl.createShader(gl.VERTEX_SHADER);

    if (vertexShaderId == null) {
      LAppPal.printMessage('failed to create vertexShader');
      return null;
    }

    const vertexShader: string =
      'precision mediump float;' +
      'attribute vec3 position;' +
      'attribute vec2 uv;' +
      'varying vec2 vuv;' +
      'void main(void)' +
      '{' +
      '   gl_Position = vec4(position, 1.0);' +
      '   vuv = uv;' +
      '}';

    gl.shaderSource(vertexShaderId, vertexShader);
    gl.compileShader(vertexShaderId);

    // 编译片段着色器
    const fragmentShaderId = gl.createShader(gl.FRAGMENT_SHADER);

    if (fragmentShaderId == null) {
      LAppPal.printMessage('failed to create fragmentShader');
      return null;
    }

    const fragmentShader: string =
      'precision mediump float;' +
      'varying vec2 vuv;' +
      'uniform sampler2D texture;' +
      'void main(void)' +
      '{' +
      '   gl_FragColor = texture2D(texture, vuv);' +
      '}';

    gl.shaderSource(fragmentShaderId, fragmentShader);
    gl.compileShader(fragmentShaderId);

    // 创建程序对象
    const programId = gl.createProgram();
    gl.attachShader(programId, vertexShaderId);
    gl.attachShader(programId, fragmentShaderId);

    gl.deleteShader(vertexShaderId);
    gl.deleteShader(fragmentShaderId);

    // 链接
    gl.linkProgram(programId);
    gl.useProgram(programId);

    return programId;
  }

  public getTextureManager(): LAppTextureManager {
    return this._textureManager;
  }

  public getFrameBuffer(): WebGLFramebuffer {
    return this._frameBuffer;
  }

  public getCanvas(): HTMLCanvasElement {
    return this._canvas;
  }

  public getGlManager(): LAppGlManager {
    return this._glManager;
  }

  public getLive2DManager(): LAppLive2DManager {
    return this._live2dManager;
  }

  /**
   * Resize the canvas to fill the screen.
   */
  private resizeCanvas(): void {
    this._canvas.width = this._canvas.clientWidth * window.devicePixelRatio;
    this._canvas.height = this._canvas.clientHeight * window.devicePixelRatio;

    const gl = this._glManager.getGl();

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  /**
   * 鼠标按下、触摸按下时调用。
   */
  public onPointBegan(pageX: number, pageY: number): void {
    if (!this._view) {
      LAppPal.printMessage('view notfound');
      return;
    }
    this._captured = true;

    const localX: number = pageX - this._canvas.offsetLeft;
    const localY: number = pageY - this._canvas.offsetTop;

    this._view.onTouchesBegan(localX, localY);
  }

  /**
   * 鼠标指针移动时调用。
   */
  public onPointMoved(pageX: number, pageY: number): void {
    if (!this._captured) {
      return;
    }

    const localX: number = pageX - this._canvas.offsetLeft;
    const localY: number = pageY - this._canvas.offsetTop;

    this._view.onTouchesMoved(localX, localY);
  }

  /**
   * 点击结束时调用。
   */
  public onPointEnded(pageX: number, pageY: number): void {
    this._captured = false;

    if (!this._view) {
      LAppPal.printMessage('view notfound');
      return;
    }

    const localX: number = pageX - this._canvas.offsetLeft;
    const localY: number = pageY - this._canvas.offsetTop;

    this._view.onTouchesEnded(localX, localY);
  }

  /**
   * 触摸取消时调用。
   */
  public onTouchCancel(pageX: number, pageY: number): void {
    this._captured = false;

    if (!this._view) {
      LAppPal.printMessage('view notfound');
      return;
    }

    const localX: number = pageX - this._canvas.offsetLeft;
    const localY: number = pageY - this._canvas.offsetTop;

    this._view.onTouchesEnded(localX, localY);
  }

  public isContextLost(): boolean {
    return this._glManager.getGl().isContextLost();
  }

  public getView(): LAppView {
    return this._view;
  }

  private _canvas: HTMLCanvasElement;

  /**
   * 视图信息
   */
  private _view: LAppView;

  /**
   * 纹理管理器
   */
  private _textureManager: LAppTextureManager;
  private _frameBuffer: WebGLFramebuffer;
  private _glManager: LAppGlManager;
  private _live2dManager: LAppLive2DManager;

  /**
   * ResizeObserver
   */
  private _resizeObserver: ResizeObserver;

  /**
   * 是否正在点击
   */
  private _captured: boolean;

  private _needResize: boolean;
}
