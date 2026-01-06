/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { LAppDelegate } from './lappdelegate';
import * as LAppDefine from './lappdefine';

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

    LAppDelegate.getInstance().run();
  },
  { passive: true }
);

/**
 * 结束时的处理
 */
window.addEventListener(
  'beforeunload',
  (): void => LAppDelegate.releaseInstance(),
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
  const statusDiv = document.getElementById('audio-status') as HTMLDivElement;

  if (!audioUpload || !playButton || !stopButton || !statusDiv) {
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
      playButton.disabled = false;
      stopButton.disabled = true;
    });
  } catch (error) {
    console.error('Error setting audio callbacks:', error);
  }
}
