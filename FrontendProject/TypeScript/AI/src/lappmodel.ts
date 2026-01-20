/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { CubismDefaultParameterId } from '@framework/cubismdefaultparameterid';
import { CubismModelSettingJson } from '@framework/cubismmodelsettingjson';
import {
  BreathParameterData,
  CubismBreath
} from '@framework/effect/cubismbreath';
import { CubismEyeBlink } from '@framework/effect/cubismeyeblink';
import { ICubismModelSetting } from '@framework/icubismmodelsetting';
import { CubismIdHandle } from '@framework/id/cubismid';
import { CubismFramework } from '@framework/live2dcubismframework';
import { CubismMatrix44 } from '@framework/math/cubismmatrix44';
import { CubismUserModel } from '@framework/model/cubismusermodel';
import {
  ACubismMotion,
  BeganMotionCallback,
  FinishedMotionCallback
} from '@framework/motion/acubismmotion';
import { CubismMotion } from '@framework/motion/cubismmotion';
import {
  CubismMotionQueueEntryHandle,
  InvalidMotionQueueEntryHandleValue
} from '@framework/motion/cubismmotionqueuemanager';
import { csmMap } from '@framework/type/csmmap';
import { csmRect } from '@framework/type/csmrectf';
import { csmString } from '@framework/type/csmstring';
import { csmVector } from '@framework/type/csmvector';
import {
  CSM_ASSERT,
  CubismLogError,
  CubismLogInfo
} from '@framework/utils/cubismdebug';

import * as LAppDefine from './lappdefine';
import { LAppPal } from './lapppal';
import { TextureInfo } from './lapptexturemanager';
import { LAppWavFileHandler } from './lappwavfilehandler';
import { LAppAudioManager } from './lappaudiomanager';
import { CubismMoc } from '@framework/model/cubismmoc';
import { LAppDelegate } from './lappdelegate';
import { LAppSubdelegate } from './lappsubdelegate';

enum LoadStep {
  LoadAssets,
  LoadModel,
  WaitLoadModel,
  LoadExpression,
  WaitLoadExpression,
  LoadPhysics,
  WaitLoadPhysics,
  LoadPose,
  WaitLoadPose,
  SetupEyeBlink,
  SetupBreath,
  LoadUserData,
  WaitLoadUserData,
  SetupEyeBlinkIds,
  SetupLipSyncIds,
  SetupLayout,
  LoadMotion,
  WaitLoadMotion,
  CompleteInitialize,
  CompleteSetupModel,
  LoadTexture,
  WaitLoadTexture,
  CompleteSetup
}

/**
 * 用户实际使用的模型的实现类<br>
 * 处理模型生成、功能组件生成、更新处理和渲染调用。
 */
export class LAppModel extends CubismUserModel {
  /**
   * 从放置 model3.json 的目录和文件路径生成模型
   * @param dir
   * @param fileName
   */
  public loadAssets(dir: string, fileName: string): void {
    this._modelHomeDir = dir;

    fetch(`${this._modelHomeDir}${fileName}`)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => {
        const setting: ICubismModelSetting = new CubismModelSettingJson(
          arrayBuffer,
          arrayBuffer.byteLength
        );

        // 更新状态
        this._state = LoadStep.LoadModel;

        // 保存结果
        this.setupModel(setting);
      })
      .catch(error => {
        // 由于在读取 model3.json 时发生错误的情况下无法绘制，因此不进行 setup，捕获错误后不做任何操作
        CubismLogError(`Failed to load file ${this._modelHomeDir}${fileName}`);
      });
  }

  /**
   * 从 model3.json 生成模型。
   * 根据 model3.json 的描述进行模型生成、动画、物理运算等组件生成。
   *
   * @param setting ICubismModelSetting 的实例
   */
  private setupModel(setting: ICubismModelSetting): void {
    this._updating = true;
    this._initialized = false;

    this._modelSetting = setting;

    // CubismModel
    if (this._modelSetting.getModelFileName() != '') {
      const modelFileName = this._modelSetting.getModelFileName();

      fetch(`${this._modelHomeDir}${modelFileName}`)
        .then(response => {
          if (response.ok) {
            return response.arrayBuffer();
          } else if (response.status >= 400) {
            CubismLogError(
              `Failed to load file ${this._modelHomeDir}${modelFileName}`
            );
            return new ArrayBuffer(0);
          }
        })
        .then(arrayBuffer => {
          this.loadModel(arrayBuffer, this._mocConsistency);
          this._state = LoadStep.LoadExpression;

          // callback
          loadCubismExpression();
        });

      this._state = LoadStep.WaitLoadModel;
    } else {
      LAppPal.printMessage('Model data does not exist.');
    }

    // Expression
    const loadCubismExpression = (): void => {
      if (this._modelSetting.getExpressionCount() > 0) {
        const count: number = this._modelSetting.getExpressionCount();

        for (let i = 0; i < count; i++) {
          const expressionName = this._modelSetting.getExpressionName(i);
          const expressionFileName =
            this._modelSetting.getExpressionFileName(i);

          fetch(`${this._modelHomeDir}${expressionFileName}`)
            .then(response => {
              if (response.ok) {
                return response.arrayBuffer();
              } else if (response.status >= 400) {
                CubismLogError(
                  `Failed to load file ${this._modelHomeDir}${expressionFileName}`
                );
                // 即使文件不存在，response 也不会返回 null，因此使用空的 ArrayBuffer 来处理
                return new ArrayBuffer(0);
              }
            })
            .then(arrayBuffer => {
              const motion: ACubismMotion = this.loadExpression(
                arrayBuffer,
                arrayBuffer.byteLength,
                expressionName
              );

              if (this._expressions.getValue(expressionName) != null) {
                ACubismMotion.delete(
                  this._expressions.getValue(expressionName)
                );
                this._expressions.setValue(expressionName, null);
              }

              this._expressions.setValue(expressionName, motion);

              this._expressionCount++;

              if (this._expressionCount >= count) {
                this._state = LoadStep.LoadPhysics;

                // callback
                loadCubismPhysics();
              }
            });
        }
        this._state = LoadStep.WaitLoadExpression;
      } else {
        this._state = LoadStep.LoadPhysics;

        // callback
        loadCubismPhysics();
      }
    };

    // Physics
    const loadCubismPhysics = (): void => {
      if (this._modelSetting.getPhysicsFileName() != '') {
        const physicsFileName = this._modelSetting.getPhysicsFileName();

        fetch(`${this._modelHomeDir}${physicsFileName}`)
          .then(response => {
            if (response.ok) {
              return response.arrayBuffer();
            } else if (response.status >= 400) {
              CubismLogError(
                `Failed to load file ${this._modelHomeDir}${physicsFileName}`
              );
              return new ArrayBuffer(0);
            }
          })
          .then(arrayBuffer => {
            this.loadPhysics(arrayBuffer, arrayBuffer.byteLength);

            this._state = LoadStep.LoadPose;

            // callback
            loadCubismPose();
          });
        this._state = LoadStep.WaitLoadPhysics;
      } else {
        this._state = LoadStep.LoadPose;

        // callback
        loadCubismPose();
      }
    };

    // Pose
    const loadCubismPose = (): void => {
      if (this._modelSetting.getPoseFileName() != '') {
        const poseFileName = this._modelSetting.getPoseFileName();

        fetch(`${this._modelHomeDir}${poseFileName}`)
          .then(response => {
            if (response.ok) {
              return response.arrayBuffer();
            } else if (response.status >= 400) {
              CubismLogError(
                `Failed to load file ${this._modelHomeDir}${poseFileName}`
              );
              return new ArrayBuffer(0);
            }
          })
          .then(arrayBuffer => {
            this.loadPose(arrayBuffer, arrayBuffer.byteLength);

            this._state = LoadStep.SetupEyeBlink;

            // callback
            setupEyeBlink();
          });
        this._state = LoadStep.WaitLoadPose;
      } else {
        this._state = LoadStep.SetupEyeBlink;

        // callback
        setupEyeBlink();
      }
    };

    // EyeBlink
    const setupEyeBlink = (): void => {
      if (this._modelSetting.getEyeBlinkParameterCount() > 0) {
        this._eyeBlink = CubismEyeBlink.create(this._modelSetting);
        this._state = LoadStep.SetupBreath;
      }

      // callback
      setupBreath();
    };

    // Breath
    const setupBreath = (): void => {
      this._breath = CubismBreath.create();

      const breathParameters: csmVector<BreathParameterData> = new csmVector();
      breathParameters.pushBack(
        new BreathParameterData(this._idParamAngleX, 0.0, 15.0, 6.5345, 0.5)
      );
      breathParameters.pushBack(
        new BreathParameterData(this._idParamAngleY, 0.0, 8.0, 3.5345, 0.5)
      );
      breathParameters.pushBack(
        new BreathParameterData(this._idParamAngleZ, 0.0, 10.0, 5.5345, 0.5)
      );
      breathParameters.pushBack(
        new BreathParameterData(this._idParamBodyAngleX, 0.0, 4.0, 15.5345, 0.5)
      );
      breathParameters.pushBack(
        new BreathParameterData(
          CubismFramework.getIdManager().getId(
            CubismDefaultParameterId.ParamBreath
          ),
          0.5,
          0.5,
          3.2345,
          1
        )
      );

      this._breath.setParameters(breathParameters);
      this._state = LoadStep.LoadUserData;

      // callback
      loadUserData();
    };

    // UserData
    const loadUserData = (): void => {
      if (this._modelSetting.getUserDataFile() != '') {
        const userDataFile = this._modelSetting.getUserDataFile();

        fetch(`${this._modelHomeDir}${userDataFile}`)
          .then(response => {
            if (response.ok) {
              return response.arrayBuffer();
            } else if (response.status >= 400) {
              CubismLogError(
                `Failed to load file ${this._modelHomeDir}${userDataFile}`
              );
              return new ArrayBuffer(0);
            }
          })
          .then(arrayBuffer => {
            this.loadUserData(arrayBuffer, arrayBuffer.byteLength);

            this._state = LoadStep.SetupEyeBlinkIds;

            // callback
            setupEyeBlinkIds();
          });

        this._state = LoadStep.WaitLoadUserData;
      } else {
        this._state = LoadStep.SetupEyeBlinkIds;

        // callback
        setupEyeBlinkIds();
      }
    };

    // EyeBlinkIds
    const setupEyeBlinkIds = (): void => {
      const eyeBlinkIdCount: number =
        this._modelSetting.getEyeBlinkParameterCount();

      for (let i = 0; i < eyeBlinkIdCount; ++i) {
        this._eyeBlinkIds.pushBack(
          this._modelSetting.getEyeBlinkParameterId(i)
        );
      }

      this._state = LoadStep.SetupLipSyncIds;

      // callback
      setupLipSyncIds();
    };

    // LipSyncIds
    const setupLipSyncIds = (): void => {
      const lipSyncIdCount = this._modelSetting.getLipSyncParameterCount();

      for (let i = 0; i < lipSyncIdCount; ++i) {
        this._lipSyncIds.pushBack(this._modelSetting.getLipSyncParameterId(i));
      }
      this._state = LoadStep.SetupLayout;

      // callback
      setupLayout();
    };

    // Layout
    const setupLayout = (): void => {
      const layout: csmMap<string, number> = new csmMap<string, number>();

      if (this._modelSetting == null || this._modelMatrix == null) {
        CubismLogError('Failed to setupLayout().');
        return;
      }

      this._modelSetting.getLayoutMap(layout);
      this._modelMatrix.setupFromLayout(layout);
      this._state = LoadStep.LoadMotion;

      // callback
      loadCubismMotion();
    };

    // Motion
    const loadCubismMotion = (): void => {
      this._state = LoadStep.WaitLoadMotion;
      this._model.saveParameters();
      this._allMotionCount = 0;
      this._motionCount = 0;
      const group: string[] = [];

      const motionGroupCount: number = this._modelSetting.getMotionGroupCount();

      // 求出动画的总数
      for (let i = 0; i < motionGroupCount; i++) {
        group[i] = this._modelSetting.getMotionGroupName(i);
        this._allMotionCount += this._modelSetting.getMotionCount(group[i]);
      }

      // 加载动画
      for (let i = 0; i < motionGroupCount; i++) {
        this.preLoadMotionGroup(group[i]);
      }

      // 如果没有动画
      if (motionGroupCount == 0) {
        this._state = LoadStep.LoadTexture;

        // 停止所有动画
        this._motionManager.stopAllMotions();

        this._updating = false;
        this._initialized = true;

        this.createRenderer();
        this.setupTextures();
        this.getRenderer().startUp(this._subdelegate.getGlManager().getGl());
      }
    };
  }

  /**
   * 将纹理加载到纹理单元
   */
  private setupTextures(): void {
    // 为了在 iPhone 上提高 alpha 质量，TypeScript 中采用 premultipliedAlpha
    const usePremultiply = true;

    if (this._state == LoadStep.LoadTexture) {
      // 用于纹理加载
      const textureCount: number = this._modelSetting.getTextureCount();

      for (
        let modelTextureNumber = 0;
        modelTextureNumber < textureCount;
        modelTextureNumber++
      ) {
        // 如果纹理名为空字符串，则跳过加载和绑定处理
        if (this._modelSetting.getTextureFileName(modelTextureNumber) == '') {
          console.log('getTextureFileName null');
          continue;
        }

        // 将纹理加载到 WebGL 的纹理单元
        let texturePath =
          this._modelSetting.getTextureFileName(modelTextureNumber);
        texturePath = this._modelHomeDir + texturePath;

        // 加载完成时调用的回调函数
        const onLoad = (textureInfo: TextureInfo): void => {
          this.getRenderer().bindTexture(modelTextureNumber, textureInfo.id);

          this._textureCount++;

          if (this._textureCount >= textureCount) {
            // 加载完成
            this._state = LoadStep.CompleteSetup;
          }
        };

        // 加载
        this._subdelegate
          .getTextureManager()
          .createTextureFromPngFile(texturePath, usePremultiply, onLoad);
        this.getRenderer().setIsPremultipliedAlpha(usePremultiply);
      }

      this._state = LoadStep.WaitLoadTexture;
    }
  }

  /**
   * 重新构建渲染器
   */
  public reloadRenderer(): void {
    this.deleteRenderer();
    this.createRenderer();
    this.setupTextures();
  }

  /**
   * 更新
   */
  public update(): void {
    if (this._state != LoadStep.CompleteSetup) return;

    const deltaTimeSeconds: number = LAppPal.getDeltaTime();
    this._userTimeSeconds += deltaTimeSeconds;

    this._dragManager.update(deltaTimeSeconds);
    this._dragX = this._dragManager.getX();
    this._dragY = this._dragManager.getY();

    // 是否有动画引起的参数更新
    let motionUpdated = false;

    //--------------------------------------------------------------------------
    this._model.loadParameters(); // 加载上次保存的状态
    if (this._isMotionEnabled) {
      if (this._motionManager.isFinished()) {
        // 如果没有动画播放，则从待机动画中随机播放
        this.startRandomMotion(
          LAppDefine.MotionGroupIdle,
          LAppDefine.PriorityIdle
        );
      } else {
        motionUpdated = this._motionManager.updateMotion(
          this._model,
          deltaTimeSeconds
        ); // 更新动画
      }
    }
    if (this._motionNo != null) {
      if (this._motionManager.isFinished()) {
        this.startMotion(
          LAppDefine.MotionGroupIdle,
          this._motionNo,
          LAppDefine.PriorityIdle
        );
      } else {
        motionUpdated = this._motionManager.updateMotion(
          this._model,
          deltaTimeSeconds
        ); // 更新动画
      }
    }
    this._model.saveParameters(); // 保存状态
    //--------------------------------------------------------------------------

    // 眨眼
    if (!motionUpdated) {
      if (this._eyeBlink != null) {
        // 当没有主动画更新时
        this._eyeBlink.updateParameters(this._model, deltaTimeSeconds); // 眨眼
      }
    }

    if (this._expressionManager != null) {
      this._expressionManager.updateMotion(this._model, deltaTimeSeconds); // 表情参数更新（相对变化）
    }

    // 拖动引起的变化
    // 拖动引起的面部朝向调整
    this._model.addParameterValueById(this._idParamAngleX, this._dragX * 30); // 添加 -30 到 30 的值
    this._model.addParameterValueById(this._idParamAngleY, this._dragY * 30);
    this._model.addParameterValueById(
      this._idParamAngleZ,
      this._dragX * this._dragY * -30
    );

    // 拖动引起的身体朝向调整
    this._model.addParameterValueById(
      this._idParamBodyAngleX,
      this._dragX * 10
    ); // 添加 -10 到 10 的值

    // 拖动引起的眼睛朝向调整
    this._model.addParameterValueById(this._idParamEyeBallX, this._dragX); // 添加 -1 到 1 的值
    this._model.addParameterValueById(this._idParamEyeBallY, this._dragY);

    // 呼吸等
    if (this._breath != null) {
      this._breath.updateParameters(this._model, deltaTimeSeconds);
    }

    // 物理运算设置
    if (this._physics != null) {
      this._physics.evaluate(this._model, deltaTimeSeconds);
    }

    // 口型同步设置
    if (this._lipsync) {
      let value = 0.0; // 如果进行实时口型同步，则从系统获取音量，输入 0~1 范围的值。

      // 优先使用外部音频管理器
      if (this._audioManager) {
        if (this._audioManager.isPlaying()) {
          value = this._audioManager.getRms();
        } else if (this._audioManager.isRecording()) {
          value = this._audioManager.getRecordingRms();
        }
      }

      // 如果没有外部音频管理器，使用原有的wav文件处理器
      if (value === 0.0) {
        this._wavFileHandler.update(deltaTimeSeconds);
        value = this._wavFileHandler.getRms();
      }

      for (let i = 0; i < this._lipSyncIds.getSize(); ++i) {
        this._model.addParameterValueById(this._lipSyncIds.at(i), value, 0.95);
      }
    }

    // 姿势设置
    if (this._pose != null) {
      this._pose.updateParameters(this._model, deltaTimeSeconds);
    }

    this._model.update();
  }

  /**
   * 开始播放参数指定的动画
   * @param group 动画组名
   * @param no 组内编号
   * @param priority 优先级
   * @param onFinishedMotionHandler 动画播放结束时调用的回调函数
   * @return 返回已开始动画的标识号。用于判断单个动画是否结束的 isFinished() 的参数。无法开始时为 [-1]
   */
  public startMotion(
    group: string,
    no: number,
    priority: number,
    onFinishedMotionHandler?: FinishedMotionCallback,
    onBeganMotionHandler?: BeganMotionCallback
  ): CubismMotionQueueEntryHandle {
    if (priority == LAppDefine.PriorityForce) {
      this._motionManager.setReservePriority(priority);
    } else if (!this._motionManager.reserveMotion(priority)) {
      if (this._debugMode) {
        LAppPal.printMessage("[APP]can't start motion.");
      }
      return InvalidMotionQueueEntryHandleValue;
    }

    const motionFileName = this._modelSetting.getMotionFileName(group, no);

    // ex) idle_0
    const name = `${group}_${no}`;
    let motion: CubismMotion = this._motions.getValue(name) as CubismMotion;
    let autoDelete = false;

    if (motion == null) {
      fetch(`${this._modelHomeDir}${motionFileName}`)
        .then(response => {
          if (response.ok) {
            return response.arrayBuffer();
          } else if (response.status >= 400) {
            CubismLogError(
              `Failed to load file ${this._modelHomeDir}${motionFileName}`
            );
            return new ArrayBuffer(0);
          }
        })
        .then(arrayBuffer => {
          motion = this.loadMotion(
            arrayBuffer,
            arrayBuffer.byteLength,
            null,
            onFinishedMotionHandler,
            onBeganMotionHandler,
            this._modelSetting,
            group,
            no,
            this._motionConsistency
          );
        });

      if (motion) {
        motion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds);
        autoDelete = true; // 结束时从内存中删除
      } else {
        CubismLogError("Can't start motion {0} .", motionFileName);
        // 重置无法加载的动画的 ReservePriority
        this._motionManager.setReservePriority(LAppDefine.PriorityNone);
        return InvalidMotionQueueEntryHandleValue;
      }
    } else {
      motion.setBeganMotionHandler(onBeganMotionHandler);
      motion.setFinishedMotionHandler(onFinishedMotionHandler);
    }

    // 语音
    const voice = this._modelSetting.getMotionSoundFileName(group, no);
    if (voice.localeCompare('') != 0) {
      let path = voice;
      path = this._modelHomeDir + path;
      this._wavFileHandler.start(path);
    }

    if (this._debugMode) {
      LAppPal.printMessage(`[APP]start motion: [${group}_${no}]`);
    }
    return this._motionManager.startMotionPriority(
      motion,
      autoDelete,
      priority
    );
  }

  /**
   * 开始播放随机选择的动画。
   * @param group 动画组名
   * @param priority 优先级
   * @param onFinishedMotionHandler 动画播放结束时调用的回调函数
   * @return 返回已开始动画的标识号。用于判断单个动画是否结束的 isFinished() 的参数。无法开始时为 [-1]
   */
  public startRandomMotion(
    group: string,
    priority: number,
    onFinishedMotionHandler?: FinishedMotionCallback,
    onBeganMotionHandler?: BeganMotionCallback
  ): CubismMotionQueueEntryHandle {
    if (this._modelSetting.getMotionCount(group) == 0) {
      return InvalidMotionQueueEntryHandleValue;
    }
    const no: number = Math.floor(
      Math.random() * this._modelSetting.getMotionCount(group)
    );
    console.log(`[APP]start motion: [${group}_${no}]`);
    return this.startMotion(
      group,
      no,
      priority,
      onFinishedMotionHandler,
      onBeganMotionHandler
    );
  }

  /**
   * 设置参数指定的表情动画
   *
   * @param expressionId 表情动画的 ID
   */
  public setExpression(expressionId: string): void {
    const motion: ACubismMotion = this._expressions.getValue(expressionId);

    if (this._debugMode) {
      LAppPal.printMessage(`[APP]expression: [${expressionId}]`);
    }

    if (motion != null) {
      this._expressionManager.startMotion(motion, false);
    } else {
      if (this._debugMode) {
        LAppPal.printMessage(`[APP]expression[${expressionId}] is null`);
      }
    }
  }

  /**
   * 设置随机选择的表情动画
   */
  public setRandomExpression(): void {
    if (this._expressions.getSize() == 0) {
      return;
    }

    const no: number = Math.floor(Math.random() * this._expressions.getSize());

    for (let i = 0; i < this._expressions.getSize(); i++) {
      if (i == no) {
        const name: string = this._expressions._keyValues[i].first;
        this.setExpression(name);
        return;
      }
    }
  }

  /**
   * 接收事件触发
   */
  public motionEventFired(eventValue: csmString): void {
    CubismLogInfo('{0} is fired on LAppModel!!', eventValue.s);
  }

  /**
   * 碰撞检测测试
   * 从指定 ID 的顶点列表计算矩形，判断坐标是否在矩形范围内。
   *
   * @param hitArenaName  要进行碰撞检测的对象 ID
   * @param x             判定的 X 坐标
   * @param y             判定的 Y 坐标
   */
  public hitTest(hitArenaName: string, x: number, y: number): boolean {
    // 透明时无碰撞检测。
    if (this._opacity < 1) {
      return false;
    }

    const count: number = this._modelSetting.getHitAreasCount();

    for (let i = 0; i < count; i++) {
      if (this._modelSetting.getHitAreaName(i) == hitArenaName) {
        const drawId: CubismIdHandle = this._modelSetting.getHitAreaId(i);
        return this.isHit(drawId, x, y);
      }
    }

    return false;
  }

  /**
   * 从组名批量加载动画数据。
   * 动画数据名称在内部从 ModelSetting 获取。
   *
   * @param group 动画数据的组名
   */
  public preLoadMotionGroup(group: string): void {
    for (let i = 0; i < this._modelSetting.getMotionCount(group); i++) {
      const motionFileName = this._modelSetting.getMotionFileName(group, i);

      // ex) idle_0
      const name = `${group}_${i}`;
      if (this._debugMode) {
        LAppPal.printMessage(
          `[APP]load motion: ${motionFileName} => [${name}]`
        );
      }

      fetch(`${this._modelHomeDir}${motionFileName}`)
        .then(response => {
          if (response.ok) {
            return response.arrayBuffer();
          } else if (response.status >= 400) {
            CubismLogError(
              `Failed to load file ${this._modelHomeDir}${motionFileName}`
            );
            return new ArrayBuffer(0);
          }
        })
        .then(arrayBuffer => {
          const tmpMotion: CubismMotion = this.loadMotion(
            arrayBuffer,
            arrayBuffer.byteLength,
            name,
            null,
            null,
            this._modelSetting,
            group,
            i,
            this._motionConsistency
          );

          if (tmpMotion != null) {
            tmpMotion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds);

            if (this._motions.getValue(name) != null) {
              ACubismMotion.delete(this._motions.getValue(name));
            }

            this._motions.setValue(name, tmpMotion);

            this._motionCount++;
          } else {
            // 如果无法 loadMotion，则动画总数会偏移，因此减 1
            this._allMotionCount--;
          }

          if (this._motionCount >= this._allMotionCount) {
            this._state = LoadStep.LoadTexture;

            // 全てのモーションを停止する
            this._motionManager.stopAllMotions();

            this._updating = false;
            this._initialized = true;

            this.createRenderer();
            this.setupTextures();
            this.getRenderer().startUp(
              this._subdelegate.getGlManager().getGl()
            );
          }
        });
    }
  }

  /**
   * 释放所有动画数据。
   */
  public releaseMotions(): void {
    this._motions.clear();
  }

  /**
   * 释放所有表情数据。
   */
  public releaseExpressions(): void {
    this._expressions.clear();
  }

  /**
   * 绘制模型的处理。传递绘制模型空间的 View-Projection 矩阵。
   */
  public doDraw(): void {
    if (this._model == null) return;

    // 传递画布尺寸
    const canvas = this._subdelegate.getCanvas();
    const viewport: number[] = [0, 0, canvas.width, canvas.height];

    this.getRenderer().setRenderState(
      this._subdelegate.getFrameBuffer(),
      viewport
    );
    this.getRenderer().drawModel();
  }

  /**
   * 绘制模型的处理。传递绘制模型空间的 View-Projection 矩阵。
   */
  public draw(matrix: CubismMatrix44): void {
    if (this._model == null) {
      return;
    }

    // 各加载完成后
    if (this._state == LoadStep.CompleteSetup) {
      matrix.multiplyByMatrix(this._modelMatrix);

      this.getRenderer().setMvpMatrix(matrix);

      this.doDraw();
    }
  }

  public async hasMocConsistencyFromFile() {
    CSM_ASSERT(this._modelSetting.getModelFileName().localeCompare(``));

    // CubismModel
    if (this._modelSetting.getModelFileName() != '') {
      const modelFileName = this._modelSetting.getModelFileName();

      const response = await fetch(`${this._modelHomeDir}${modelFileName}`);
      const arrayBuffer = await response.arrayBuffer();

      this._consistency = CubismMoc.hasMocConsistency(arrayBuffer);

      if (!this._consistency) {
        CubismLogInfo('Inconsistent MOC3.');
      } else {
        CubismLogInfo('Consistent MOC3.');
      }

      return this._consistency;
    } else {
      LAppPal.printMessage('Model data does not exist.');
    }
  }

  public setSubdelegate(subdelegate: LAppSubdelegate): void {
    this._subdelegate = subdelegate;
  }

  /**
   * 设置外部音频管理器
   * @param audioManager 音频管理器实例
   */
  public setAudioManager(audioManager: LAppAudioManager): void {
    this._audioManager = audioManager;
  }

  /**
   * 获取外部音频管理器
   * @returns 音频管理器实例
   */
  public getAudioManager(): LAppAudioManager | null {
    return this._audioManager;
  }

  /**
   * 停止所有动画播放
   */
  public stopAllMotions(): void {
    this._motionManager.stopAllMotions();
  }

  /**
   * 重新启动待机动画
   */
  public restartIdleMotion(): void {
    // 播放随机待机动画
    this.startRandomMotion(LAppDefine.MotionGroupIdle, LAppDefine.PriorityIdle);
  }

  /**
   * 启用动画播放
   */
  public enableMotion(): void {
    this._isMotionEnabled = true;
  }

  /**
   * 禁用动画播放
   */
  public stopMotion(): void {
    this._isMotionEnabled = false;
    this._motionNo = null;
  }

  /**
   * 禁用动画播放
   */
  public disableMotion(): void {
    this._isMotionEnabled = false;
    this._motionNo = null;
    this.stopAllMotions();
  }

  /**
   * 获取动画播放状态
   * @returns 是否启用动画播放
   */
  public isMotionEnabled(): boolean {
    return this._isMotionEnabled || this._motionNo != null;
  }

  /**
   * 设置要播放的动画序号
   * @param motionNo 动画序号
   */
  public setMotionNo(motionNo: number): void {
    this._motionNo = motionNo;
  }

  /**
   * 获取当前设置的动画序号
   * @returns 动画序号
   */
  public getMotionNo(): number {
    return this._motionNo;
  }

  /**
   * 检查模型是否已完成初始化
   * @returns 是否已完成初始化
   */
  public isInitialized(): boolean {
    return this._state == LoadStep.CompleteSetup && this._modelSetting != null;
  }

  /**
   * 构造函数
   */
  public constructor() {
    super();

    this._modelSetting = null;
    this._modelHomeDir = null;
    this._userTimeSeconds = 0.0;

    this._eyeBlinkIds = new csmVector<CubismIdHandle>();
    this._lipSyncIds = new csmVector<CubismIdHandle>();

    this._motions = new csmMap<string, ACubismMotion>();
    this._expressions = new csmMap<string, ACubismMotion>();

    this._hitArea = new csmVector<csmRect>();
    this._userArea = new csmVector<csmRect>();

    this._idParamAngleX = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamAngleX
    );
    this._idParamAngleY = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamAngleY
    );
    this._idParamAngleZ = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamAngleZ
    );
    this._idParamEyeBallX = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamEyeBallX
    );
    this._idParamEyeBallY = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamEyeBallY
    );
    this._idParamBodyAngleX = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamBodyAngleX
    );

    if (LAppDefine.MOCConsistencyValidationEnable) {
      this._mocConsistency = true;
    }

    if (LAppDefine.MotionConsistencyValidationEnable) {
      this._motionConsistency = true;
    }

    this._state = LoadStep.LoadAssets;
    this._expressionCount = 0;
    this._textureCount = 0;
    this._motionCount = 0;
    this._allMotionCount = 0;
    this._wavFileHandler = new LAppWavFileHandler();
    this._audioManager = null;
    this._consistency = false;
    this._isMotionEnabled = false; // 默认不播放动画
  }

  private _subdelegate: LAppSubdelegate;

  _modelSetting: ICubismModelSetting; // 模型设置信息
  _modelHomeDir: string; // 模型设置所在的目录
  _userTimeSeconds: number; // 增量时间的累积值[秒]

  _eyeBlinkIds: csmVector<CubismIdHandle>; // 模型中设置的眨眼功能参数 ID
  _lipSyncIds: csmVector<CubismIdHandle>; // 模型中设置的口型同步功能参数 ID

  _motions: csmMap<string, ACubismMotion>; // 已加载的动画列表
  _expressions: csmMap<string, ACubismMotion>; // 已加载的表情列表

  _hitArea: csmVector<csmRect>;
  _userArea: csmVector<csmRect>;

  _idParamAngleX: CubismIdHandle; // 参数 ID: ParamAngleX
  _idParamAngleY: CubismIdHandle; // 参数 ID: ParamAngleY
  _idParamAngleZ: CubismIdHandle; // 参数 ID: ParamAngleZ
  _idParamEyeBallX: CubismIdHandle; // 参数 ID: ParamEyeBallX
  _idParamEyeBallY: CubismIdHandle; // 参数 ID: ParamEyeBAllY
  _idParamBodyAngleX: CubismIdHandle; // 参数 ID: ParamBodyAngleX

  _state: LoadStep; // 当前状态管理用
  _expressionCount: number; // 表情数据计数
  _textureCount: number; // 纹理计数
  _motionCount: number; // 动画数据计数
  _allMotionCount: number; // 动画总数
  _wavFileHandler: LAppWavFileHandler; // wav 文件处理器
  _audioManager: LAppAudioManager | null; // 外部音频管理器
  _consistency: boolean; // MOC3 一致性检查管理用
  _isMotionEnabled: boolean; // 动画播放控制标志
  _motionNo: number; // 播放的动画的序号
}
