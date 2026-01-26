/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import React, { useState, useEffect } from 'react';
import { LAppDelegate } from '../lappdelegate';

const AudioControls: React.FC = () => {
  const [audioStatus, setAudioStatus] = useState<string>('未加载音频');
  const [playDisabled, setPlayDisabled] = useState<boolean>(true);
  const [stopDisabled, setStopDisabled] = useState<boolean>(true);

  const getAudioManager = () => {
    return LAppDelegate.getInstance()
      ._subdelegates.at(0)
      .getLive2DManager()
      .getAudioManager();
  };

  useEffect(() => {
    // 设置音频管理器回调
    try {
      const audioManager = getAudioManager();

      audioManager.setOnPlayCallback(() => {
        setAudioStatus('正在播放...');
        setPlayDisabled(true);
        setStopDisabled(false);
      });

      audioManager.setOnStopCallback(() => {
        setAudioStatus('已停止');
        setPlayDisabled(false);
        setStopDisabled(true);
      });

      audioManager.setOnEndCallback(() => {
        setAudioStatus('播放结束');
      });
    } catch (error) {
      console.error('Error setting up audio callbacks:', error as Error);
    }
  }, []);

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setAudioStatus('正在加载音频...');

    const audioManager = getAudioManager();

    audioManager
      .loadAudioFromFile(file)
      .then(success => {
        if (success) {
          setAudioStatus(`已加载: ${file.name}`);
          setPlayDisabled(false);
          setStopDisabled(true);
        } else {
          setAudioStatus('音频加载失败');
          setPlayDisabled(true);
          setStopDisabled(true);
        }
      })
      .catch(error => {
        console.error('Error loading audio:', error as Error);
        setAudioStatus('音频加载出错');
        setPlayDisabled(true);
        setStopDisabled(true);
      });
  };

  const handlePlayAudio = () => {
    try {
      const audioManager = getAudioManager();

      if (audioManager.isLoaded()) {
        audioManager.play();
        setAudioStatus('正在播放...');
        setPlayDisabled(true);
        setStopDisabled(false);
      }
    } catch (error) {
      console.error('Error playing audio:', error as Error);
      setAudioStatus('播放出错');
    }
  };

  const handleStopAudio = () => {
    try {
      const audioManager = getAudioManager();

      audioManager.stop();
      setAudioStatus('已停止');
      setPlayDisabled(false);
      setStopDisabled(true);
    } catch (error) {
      console.error('Error stopping audio:', error as Error);
      setAudioStatus('停止出错');
    }
  };

  return (
    <div id="audio-controls">
      <label htmlFor="audio-upload">上传音频文件:</label>
      <input
        type="file"
        id="audio-upload"
        accept="audio/*"
        onChange={handleAudioUpload}
      />
      <button id="play-audio" disabled={playDisabled} onClick={handlePlayAudio}>
        播放音频
      </button>
      <button id="stop-audio" disabled={stopDisabled} onClick={handleStopAudio}>
        停止音频
      </button>
      <div id="audio-status">{audioStatus}</div>
    </div>
  );
};

export default AudioControls;
