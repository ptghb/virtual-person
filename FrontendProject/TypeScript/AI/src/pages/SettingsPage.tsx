import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Switch } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

export const SettingsPage: React.FC = () => (
  <div className="settings-page">
    <div className="settings-page__header">
      <Link to="/">
        <Button icon={<ArrowLeftOutlined />}>返回</Button>
      </Link>
      <div>
        <h1>设置与隐私</h1>
        <p>设备权限永远由你主动开启。</p>
      </div>
    </div>
    <div className="settings-grid">
      <Card title="回复体验">
        <div className="setting-row">
          <span>默认播放语音</span>
          <Switch defaultChecked />
        </div>
        <div className="setting-row">
          <span>回答时播放动作</span>
          <Switch defaultChecked />
        </div>
      </Card>
      <Card title="隐私原则">
        <ul>
          <li>普通模式不会申请麦克风和摄像头权限。</li>
          <li>照片会在预览确认后发送。</li>
          <li>离开升级模式后会关闭设备媒体轨道。</li>
          <li>持续聆听状态始终显示在页面顶部。</li>
        </ul>
      </Card>
      <Card title="直播输出">
        <p>OBS 浏览器源建议使用：</p>
        <code>/live/stage?transparent=1&amp;subtitle=1</code>
      </Card>
    </div>
  </div>
);
