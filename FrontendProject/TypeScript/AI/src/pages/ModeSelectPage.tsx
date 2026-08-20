import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { ArrowRightOutlined, SettingOutlined } from '@ant-design/icons';
import { MODE_REGISTRY } from '../modes/mode.registry';
import { useCompanionProfile } from '../services/companion-profile.service';

export const ModeSelectPage: React.FC = () => {
  const { profile } = useCompanionProfile();
  return <div className="mode-select-page">
    <div className="mode-select-hero">
      <div className="brand-orb">{profile.name}</div>
      <p className="eyebrow">AI GIRLFRIEND</p>
      <h1>今天想用哪种方式和我相处？</h1>
      <p>从轻松聊天，到看见、听见你，再到陪你一起直播。</p>
    </div>

    <div className="mode-card-grid">
      {Object.values(MODE_REGISTRY).map(mode => (
        <Link className="mode-card glass-panel" to={mode.route} key={mode.id}>
          <span className="mode-card__icon">{mode.icon}</span>
          <div>
            <h2>{mode.title}</h2>
            <p>{mode.subtitle}</p>
          </div>
          <Button type="primary" icon={<ArrowRightOutlined />}>
            进入
          </Button>
        </Link>
      ))}
    </div>

    <Link className="settings-shortcut" to="/settings">
      <SettingOutlined />
      设置与隐私
    </Link>
  </div>;
};
