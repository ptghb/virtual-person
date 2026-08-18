import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { HomeOutlined, SettingOutlined } from '@ant-design/icons';
import type { AppMode } from '../modes/mode.types';
import { MODE_REGISTRY } from '../modes/mode.registry';
import { ConnectionBadge } from './ConnectionBadge';
import type { ConnectionState } from '../websocketmanager';
import { useCompanionProfile } from '../services/companion-profile.service';

interface AppShellProps {
  mode: AppMode;
  connectionState: ConnectionState;
  children: React.ReactNode;
  stage: React.ReactNode;
  statusItems?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  mode,
  connectionState,
  children,
  stage,
  statusItems
}) => {
  const definition = MODE_REGISTRY[mode];
  const { profile } = useCompanionProfile();
  return (
    <div className={`app-shell app-shell--${mode}`}>
      <header className="mode-header glass-panel">
        <div className="mode-header__identity">
          <Link to="/" aria-label="返回模式选择">
            <Button type="text" icon={<HomeOutlined />} />
          </Link>
          <div>
            <strong>{profile.name}</strong>
            <span>{definition.title}</span>
          </div>
        </div>
        <div className="mode-header__status">
          {statusItems}
          <ConnectionBadge state={connectionState} />
          <Link to="/settings">
            <Button type="text" icon={<SettingOutlined />} aria-label="设置" />
          </Link>
        </div>
      </header>
      <main className="mode-layout">
        <section className="avatar-column">{stage}</section>
        <section className="workspace-column">{children}</section>
      </main>
    </div>
  );
};
