import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Button, Input, Space } from 'antd';
import {
  CameraOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useCompanionProfile } from '../services/companion-profile.service';

interface VisionControlProps {
  connected: boolean;
  openSignal: number;
  requestedPrompt?: string | null;
  onSend: (base64: string, previewUrl: string, prompt: string | null) => boolean;
  compact?: boolean;
}

export const VisionControl: React.FC<VisionControlProps> = ({
  connected,
  openSignal,
  requestedPrompt,
  onSend,
  compact = false
}) => {
  const { profile } = useCompanionProfile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [preview, setPreview] = useState('');
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  };

  const openCamera = async () => {
    setError('');
    setPreview('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '无法访问摄像头'
      );
      closeCamera();
    }
  };

  useEffect(() => {
    if (openSignal > 0) {
      setPrompt(requestedPrompt ?? '');
      void openCamera();
    }
    // openSignal 是明确的用户授权触发器。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOpen || preview || !video || !stream) return;

    video.srcObject = stream;
    void video.play().catch(reason => {
      setError(
        reason instanceof Error ? reason.message : '摄像头画面播放失败'
      );
    });
  }, [cameraOpen, preview]);

  useEffect(() => () => closeCamera(), []);

  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setError('摄像头还没有准备好，请稍后再试');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    setPreview(canvas.toDataURL('image/jpeg', 0.82));
  };

  const confirm = () => {
    const base64 = preview.split(',')[1];
    if (base64 && onSend(base64, preview, prompt || null)) {
      setPreview('');
      closeCamera();
    }
  };

  const trigger = (
      <Button
        icon={<CameraOutlined />}
        disabled={!connected}
        onClick={() => void openCamera()}
      >
        让我看看
      </Button>
  );

  return (
    <>
      {compact ? (
        <div className="vision-control__compact">
          {trigger}
          {error && <Alert type="error" showIcon message={error} />}
        </div>
      ) : (
        <div className="capability-card">
          <div className="capability-card__heading">
            <span className="capability-icon">📷</span>
            <div>
              <strong>视觉</strong>
              <span>只有你允许后，{profile.name}才能看到照片</span>
            </div>
          </div>
          {trigger}
          {error && <Alert type="error" showIcon message={error} />}
        </div>
      )}
      {cameraOpen &&
        createPortal(
          <div className="camera-confirm-overlay" role="presentation">
            <div
              className="camera-confirm-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="camera-confirm-title"
            >
              <div className="camera-confirm-dialog__header">
                <strong id="camera-confirm-title">拍照前请确认画面</strong>
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  aria-label="关闭拍照窗口"
                  onClick={() => {
                    setPreview('');
                    closeCamera();
                  }}
                />
              </div>
              <div className="camera-dialog">
                {preview ? (
                  <img src={preview} alt="待发送照片预览" />
                ) : (
                  <video ref={videoRef} muted playsInline autoPlay />
                )}
                <Input
                  value={prompt}
                  onChange={event => setPrompt(event.target.value)}
                  placeholder={`想让${profile.name}看什么？例如：看看我的气色`}
                />
                <Space>
                  {preview ? (
                    <>
                      <Button onClick={() => setPreview('')}>重新拍摄</Button>
                      <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={confirm}
                      >
                        确认发送
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button icon={<CloseOutlined />} onClick={closeCamera}>
                        取消
                      </Button>
                      <Button
                        type="primary"
                        icon={<CameraOutlined />}
                        onClick={capture}
                      >
                        拍照
                      </Button>
                    </>
                  )}
                </Space>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
