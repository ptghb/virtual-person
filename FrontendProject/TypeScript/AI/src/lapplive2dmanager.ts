/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { CubismMatrix44 } from '@framework/math/cubismmatrix44';
import { ACubismMotion } from '@framework/motion/acubismmotion';
import { csmVector } from '@framework/type/csmvector';

import * as LAppDefine from './lappdefine';
import { LAppModel } from './lappmodel';
import { LAppPal } from './lapppal';
import { LAppSubdelegate } from './lappsubdelegate';
import { LAppAudioManager } from './lappaudiomanager';
import { getSelectedAvatarModel } from './services/avatar-preference.service';

/**
 * 在示例应用程序中管理 CubismModel 的类
 * 处理模型的生成和销毁、点击事件处理、模型切换。
 */
export class LAppLive2DManager {
  /**
   * 释放当前场景中保存的所有模型
   */
  private releaseAllModel(): void {
    this._models.clear();
  }

  /**
   * 拖动屏幕时的处理
   *
   * @param x 屏幕的X坐标
   * @param y 屏幕的Y坐标
   */
  public onDrag(x: number, y: number): void {
    const model: LAppModel = this._models.at(0);
    if (model) {
      model.setDragging(x, y);
    }
  }

  /**
   * 点击屏幕时的处理
   *
   * @param x 屏幕的X坐标
   * @param y 屏幕的Y坐标
   */
  public onTap(x: number, y: number): void {
    if (LAppDefine.DebugLogEnable) {
      LAppPal.printMessage(
        `[APP]tap point: {x: ${x.toFixed(2)} y: ${y.toFixed(2)}}`
      );
    }

    const model: LAppModel = this._models.at(0);

    if (model.hitTest(LAppDefine.HitAreaNameHead, x, y)) {
      if (LAppDefine.DebugLogEnable) {
        LAppPal.printMessage(`[APP]hit area: [${LAppDefine.HitAreaNameHead}]`);
      }
      model.setRandomExpression();
    } else if (model.hitTest(LAppDefine.HitAreaNameBody, x, y)) {
      if (LAppDefine.DebugLogEnable) {
        LAppPal.printMessage(`[APP]hit area: [${LAppDefine.HitAreaNameBody}]`);
      }
      model.startRandomMotion(
        LAppDefine.MotionGroupTapBody,
        LAppDefine.PriorityNormal,
        this.finishedMotion,
        this.beganMotion
      );
    }
  }

  /**
   * 更新屏幕时的处理
   * 执行模型的更新处理和绘制处理
   */
  public onUpdate(): void {
    const { width, height } = this._subdelegate.getCanvas();

    const projection: CubismMatrix44 = new CubismMatrix44();
    const model: LAppModel = this._models.at(0);

    if (model.getModel()) {
      if (model.getModel().getCanvasWidth() > 1.0 && width < height) {
        // 当在纵向窗口中显示横向较长的模型时，根据模型的横向尺寸计算缩放比例
        model.getModelMatrix().setWidth(2.0);
        projection.scale(1.0, width / height);
      } else {
        projection.scale(height / width, 1.0);
      }

      // 如有需要，在此处进行乘法运算
      if (this._viewMatrix != null) {
        projection.multiplyByMatrix(this._viewMatrix);
      }
    }

    model.update();
    model.draw(projection); // 由于是引用传递，projection 会发生变化。
  }

  /**
   * 切换到下一个场景
   * 在示例应用程序中进行模型集的切换。
   */
  public nextScene(): void {
    const no: number = (this._sceneIndex + 1) % LAppDefine.ModelDirSize;
    this.changeScene(no);
  }

  /**
   * 切换场景
   * 在示例应用程序中进行模型集的切换。
   * @param index
   */
  private changeScene(index: number): void {
    this._sceneIndex = index;

    if (LAppDefine.DebugLogEnable) {
      LAppPal.printMessage(`[APP]model index: ${this._sceneIndex}`);
    }

    // 从 ModelDir[] 中保存的目录名
    // 确定 model3.json 的路径。
    // 请确保目录名与 model3.json 的名称一致。
    const model: string = LAppDefine.ModelDir[index];
    const modelPath: string = LAppDefine.ResourcesPath + model + '/';
    let modelJsonName: string = LAppDefine.ModelDir[index];
    modelJsonName += '.model3.json';

    this.releaseAllModel();
    const instance = new LAppModel();
    instance.setSubdelegate(this._subdelegate);
    instance.setAudioManager(this._audioManager);
    instance.loadAssets(modelPath, modelJsonName);
    this._models.pushBack(instance);
  }

  /**
   * 按名称切换虚拟人物。
   */
  public changeModel(modelName: string): boolean {
    const index = LAppDefine.ModelDir.indexOf(modelName);
    if (index < 0) return false;
    if (index === this._sceneIndex && this._models.getSize() > 0) return true;
    this.changeScene(index);
    return true;
  }

  public setViewMatrix(m: CubismMatrix44) {
    for (let i = 0; i < 16; i++) {
      this._viewMatrix.getArray()[i] = m.getArray()[i];
    }
  }

  /**
   * 添加模型
   */
  public addModel(sceneIndex: number = 0): void {
    this._sceneIndex = sceneIndex;
    this.changeScene(this._sceneIndex);
  }

  /**
   * 构造函数
   */
  public constructor() {
    this._subdelegate = null;
    this._viewMatrix = new CubismMatrix44();
    this._models = new csmVector<LAppModel>();
    const selectedModel = getSelectedAvatarModel();
    const selectedIndex = LAppDefine.ModelDir.indexOf(selectedModel);
    this._sceneIndex = selectedIndex >= 0 ? selectedIndex : 0;
    this._audioManager = new LAppAudioManager();
  }

  /**
   * 释放资源。
   */
  public release(): void {
    if (this._audioManager) {
      this._audioManager.release();
    }
  }

  /**
   * 初始化。
   * @param subdelegate
   */
  public initialize(subdelegate: LAppSubdelegate): void {
    this._subdelegate = subdelegate;
    this.changeScene(this._sceneIndex);

    // 将音频管理器设置到模型中
    const model: LAppModel = this._models.at(0);
    if (model && this._audioManager) {
      model.setAudioManager(this._audioManager);

      // 回答音频结束后停止人物动作，不回退到待机动画。
      // 音频开始前的音源切换不会触发此回调，故动作能与说话同时播放。
      this._audioManager.setOnMotionRestartCallback(() => {
        const activeModel = this._models.at(0);
        if (!activeModel) return;
        activeModel.stopMotion();
        activeModel.stopAllMotions();
      });
    }
  }

  /**
   * 自身所属的 Subdelegate
   */
  private _subdelegate: LAppSubdelegate;

  _viewMatrix: CubismMatrix44; // 用于模型绘制的视图矩阵
  _models: csmVector<LAppModel>; // 模型实例的容器
  private _sceneIndex: number; // 要显示的场景索引值
  _audioManager: LAppAudioManager; // 音频管理器

  // 动画播放开始的回调函数
  beganMotion = (self: ACubismMotion): void => {
    LAppPal.printMessage('Motion Began:');
    console.log(self);
  };
  // 动画播放结束的回调函数
  finishedMotion = (self: ACubismMotion): void => {
    LAppPal.printMessage('Motion Finished:');
    console.log(self);
  };

  /**
   * 获取音频管理器
   * @returns 音频管理器实例
   */
  public getAudioManager(): LAppAudioManager {
    return this._audioManager;
  }

  /**
   * 启用所有模型的动画播放
   */
  public enableMotion(): void {
    const model: LAppModel = this._models.at(0);
    if (model) {
      model.enableMotion();
    }
  }

  /**
   * 禁用所有模型的动画播放
   */
  public disableMotion(): void {
    const model: LAppModel = this._models.at(0);
    if (model) {
      model.disableMotion();
    }
  }

  /**
   * 切换动画播放状态
   */
  public toggleMotion(): void {
    const model: LAppModel = this._models.at(0);
    if (model) {
      if (model.isMotionEnabled() || model._motionNo != null) {
        model.stopMotion();
      } else {
        model.enableMotion();
      }
    }
  }

  /**
   * 播放指定序号的动画
   * @param motionNo 动画序号
   */
  public playMotionByNo(motionNo: number): void {
    const model: LAppModel = this._models.at(0);
    if (model) {
      // 停止动画播放
      model.stopMotion();
      // 设置动画序号
      model.setMotionNo(motionNo);
    }
  }

  /**
   * 判断浏览器客户区坐标是否落在当前 Live2D 模型的任意碰撞区域内。
   */
  public hitTestClientPoint(clientX: number, clientY: number): boolean {
    const model = this._models.at(0);
    const canvas = this._subdelegate?.getCanvas();
    if (!model || !canvas || !model.isInitialized()) return false;

    const rect = canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    if (
      canvasX < 0 ||
      canvasX > rect.width ||
      canvasY < 0 ||
      canvasY > rect.height
    ) {
      return false;
    }

    const view = this._subdelegate.getView();
    const hitAreaCount = model._modelSetting.getHitAreasCount();
    // 小手图标本身有一定面积，检测中心点及周围多个采样点，避免视觉上
    // 已经碰到人物边缘但中心点尚未进入模型碰撞区。
    const samples = [
      [0, 0],
      [-28, 0],
      [28, 0],
      [0, -28],
      [0, 28],
      [-20, -20],
      [20, -20],
      [-20, 20],
      [20, 20]
    ];

    for (const [offsetX, offsetY] of samples) {
      const sampleX = canvasX + offsetX;
      const sampleY = canvasY + offsetY;
      if (
        sampleX < 0 ||
        sampleX > rect.width ||
        sampleY < 0 ||
        sampleY > rect.height
      ) {
        continue;
      }

      const viewX = view.transformViewX(
        sampleX * window.devicePixelRatio
      );
      const viewY = view.transformViewY(
        sampleY * window.devicePixelRatio
      );
      for (let index = 0; index < hitAreaCount; index++) {
        if (
          model.hitTest(
            model._modelSetting.getHitAreaName(index),
            viewX,
            viewY
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 被小手碰触时，从 TapBody 和 Idle 的全部动作中随机播放一个。
   */
  public playRandomTouchMotion(): void {
    const model = this._models.at(0);
    if (!model || !model.isInitialized()) return;

    const candidates: Array<{ group: string; index: number }> = [];
    [LAppDefine.MotionGroupTapBody, LAppDefine.MotionGroupIdle].forEach(group => {
      const motionCount = model._modelSetting.getMotionCount(group);
      for (let index = 0; index < motionCount; index++) {
        candidates.push({ group, index });
      }
    });
    if (candidates.length === 0) return;

    const selected =
      candidates[Math.floor(Math.random() * candidates.length)];
    model.stopMotion();
    model.stopAllMotions();
    // LAppModel 仅在动画开关打开时才会推进 MotionManager。之前虽然把动作
    // 加入了队列，但每帧没有更新，所以人物保持不动。
    model.enableMotion();
    model.startMotion(
      selected.group,
      selected.index,
      LAppDefine.PriorityForce,
      () => {
        // 触摸动作只播放一次，结束后回到自然眨眼/呼吸状态。
        model.stopMotion();
        model.stopAllMotions();
      }
    );
  }

  /**
   * 获取当前模型的名称
   * @returns 当前模型名称，如果没有模型则返回空字符串
   */
  public getCurrentModelName(): string {
    if (this._sceneIndex >= 0 && this._sceneIndex < LAppDefine.ModelDirSize) {
      return LAppDefine.ModelDir[this._sceneIndex];
    }
    return '';
  }
}
