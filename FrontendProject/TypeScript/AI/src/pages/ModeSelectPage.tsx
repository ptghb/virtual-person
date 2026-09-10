import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import {
  ArrowRightOutlined,
  DatabaseOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { MODE_REGISTRY } from '../modes/mode.registry';
import { useCompanionProfile } from '../services/companion-profile.service';

export const ModeSelectPage: React.FC = () => {
  const { profile } = useCompanionProfile();
  return (
    <div className="mode-select-page mode-select-page--overlay">
      {/* 左上角：品牌标识，不挡住虚拟人物 */}
      <div className="mode-select-brand">
        <div className="brand-orb">{profile.name}</div>
        <p className="eyebrow">AI GIRLFRIEND</p>
        <h1>今天想用哪种方式和我相处？</h1>
        <p>从轻松聊天，到看见、听见你，再到陪你一起直播。</p>
      </div>

      {/* 右侧：模式卡片 + 快捷入口，竖向排列 */}
      <div className="mode-select-sidebar">
        <div className="mode-card-list">
          {Object.values(MODE_REGISTRY).map(mode => (
            <Link className="mode-card glass-panel" to={mode.route} key={mode.id}>
              <span className="mode-card__icon">{mode.icon}</span>
              <div className="mode-card__body">
                <h2>{mode.title}</h2>
                <p>{mode.subtitle}</p>
              </div>
              <Button type="primary" icon={<ArrowRightOutlined />}>
                进入
              </Button>
            </Link>
          ))}
        </div>

        <div className="mode-select-shortcuts">
          <Link className="settings-shortcut" to="/memories">
            <DatabaseOutlined />
            记忆管理
          </Link>
          <Link className="settings-shortcut" to="/settings">
            <SettingOutlined />
            设置与隐私
          </Link>
        </div>
      </div>
    </div>
  );
};
