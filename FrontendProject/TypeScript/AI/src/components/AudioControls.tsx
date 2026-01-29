/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import React, { useState, useEffect } from 'react';
import { LAppDelegate } from '../lappdelegate';
import { Button, Upload, Card, Typography } from 'antd';
import { UploadOutlined, PlayCircleOutlined, StopOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Text } = Typography;

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
        setPlayDisabled(false);
        setStopDisabled(true);
      });
    } catch (error) {
      console.error('Error setting up audio callbacks:', error as Error);
    }
  }, []);

  const handleAudioUpload = (file: File) => {
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

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      handleAudioUpload(file as File);
      return false;
    },
    showUploadList: false,
    accept: 'audio/*',
  };

  return (
    <Card title="音频控制" size="small" style={{ marginBottom: '10px' }}>
      <Upload {...uploadProps}>
        <Button icon={<UploadOutlined />} block>
          上传音频文件
        </Button>
      </Upload>
      <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          disabled={playDisabled}
          onClick={handlePlayAudio}
          style={{ flex: 1 }}
        >
          播放
        </Button>
        <Button
          danger
          icon={<StopOutlined />}
          disabled={stopDisabled}
          onClick={handleStopAudio}
          style={{ flex: 1 }}
        >
          停止
        </Button>
      </div>
      <div style={{ marginTop: '10px' }}>
        <Text type="secondary">状态: {audioStatus}</Text>
      </div>
    </Card>
  );
};

export default AudioControls;
