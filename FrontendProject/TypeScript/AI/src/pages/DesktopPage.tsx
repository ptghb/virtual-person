import React, { useCallback, useEffect, useState } from 'react';
import { Button, Tooltip } from 'antd';
import {
  CommentOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  MinusOutlined,
  PoweroffOutlined,
  SettingOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { DigitalHumanStage } from '../components/DigitalHumanStage';
import { useCompanionProfile } from '../services/companion-profile.service';

type BackendStatus = { ok: boolean; url: string; status: number };

export const DesktopPage: React.FC = () => {
  const { profile } = useCompanionProfile();
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [clickThrough, setClickThrough] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const desktop = window.desktop;

  const refreshStatus = useCallback(async () => {
    if (!desktop) return;
    setStatus(await desktop.getBackendStatus());
  }, [desktop]);

  useEffect(() => {
    void refreshStatus();
    const timer = window.setInterval((): void => {
      void refreshStatus();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [refreshStatus]);

  const toggleClickThrough = async () => {
    if (!desktop) return;
    setClickThrough(await desktop.setClickThrough(!clickThrough));
  };

  const toggleAlwaysOnTop = async () => {
    if (!desktop) return;
    setAlwaysOnTop(await desktop.setAlwaysOnTop(!alwaysOnTop));
  };

  return (
    <main className="desktop-page">
      <DigitalHumanStage transparent subtitle={`${profile.name}正在陪着你`} />
      <div className="desktop-toolbar" role="toolbar" aria-label="桌面人物工具栏">
        <span className={`desktop-status-dot ${status?.ok ? 'is-online' : ''}`} />
        <Tooltip title={status?.ok ? '后端已连接' : '后端未连接'}>
          <Button
            type="text"
            icon={<SyncOutlined spin={!status} />}
            onClick={() => void refreshStatus()}
            aria-label="刷新后端状态"
          />
        </Tooltip>
        <Tooltip title={clickThrough ? '关闭点击穿透' : '开启点击穿透'}>
          <Button
            type={clickThrough ? 'primary' : 'text'}
            icon={clickThrough ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => void toggleClickThrough()}
            aria-label="切换点击穿透"
          />
        </Tooltip>
        <Tooltip title={alwaysOnTop ? '取消置顶' : '保持置顶'}>
          <Button
            type={alwaysOnTop ? 'primary' : 'text'}
            icon={<PoweroffOutlined />}
            onClick={() => void toggleAlwaysOnTop()}
            aria-label="切换窗口置顶"
          />
        </Tooltip>
        <Tooltip title="打开聊天">
          <Button
            type="text"
            icon={<CommentOutlined />}
            onClick={() => void desktop?.openChat()}
            aria-label="打开聊天"
          />
        </Tooltip>
        <Tooltip title="最小化到托盘">
          <Button
            type="text"
            icon={<MinusOutlined />}
            onClick={() => void desktop?.close()}
            aria-label="最小化到托盘"
          />
        </Tooltip>
        <Tooltip title="设置">
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => void desktop?.openSettings()}
            aria-label="打开设置"
          />
        </Tooltip>
      </div>
    </main>
  );
};
