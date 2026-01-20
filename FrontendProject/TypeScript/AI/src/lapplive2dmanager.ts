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
    this._sceneIndex = 0;
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

      // 设置音频播放时停止动画的回调
      this._audioManager.setOnMotionStopCallback(() => {
        model.stopAllMotions();
      });

      // 设置音频停止时重启动画的回调
      this._audioManager.setOnMotionRestartCallback(() => {
        model.restartIdleMotion();
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
}
