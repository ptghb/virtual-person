import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Checkbox, Empty, Switch, Tag } from 'antd';
import {
  ClearOutlined,
  ExportOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { AppShell } from '../components/AppShell';
import { ConversationPanel } from '../components/ConversationPanel';
import { DigitalHumanStage } from '../components/DigitalHumanStage';
import { getDycastUrl } from '../config';
import { useConversationSession } from '../hooks/useConversationSession';

interface LiveUser {
  name?: string;
}

interface LiveEvent {
  id?: string;
  method?: string;
  content?: string;
  user?: LiveUser;
  gift?: { name?: string; count?: number | string };
}

const policyLabels: Record<string, string> = {
  chat: '评论',
  member: '进入',
  social: '关注',
  like: '点赞'
};

export const LiveConsolePage: React.FC = () => {
  const session = useConversationSession('livestream_console', true);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [autoReply, setAutoReply] = useState(true);
  const [policies, setPolicies] = useState<Record<string, boolean>>({
    chat: true,
    member: true,
    social: true,
    like: true
  });

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (
        event as CustomEvent<{ comments?: LiveEvent[] }>
      ).detail;
      if (detail?.comments) {
        setEvents(previous => [...detail.comments!, ...previous].slice(0, 100));
      }
    };
    window.addEventListener('livestream-event-batch', handler);
    return () => window.removeEventListener('livestream-event-batch', handler);
  }, []);

  const stats = useMemo(
    () =>
      events.reduce<Record<string, number>>((result, event) => {
        const key = event.method ?? 'Unknown';
        result[key] = (result[key] ?? 0) + 1;
        return result;
      }, {}),
    [events]
  );

  const setAutoReplyEnabled = (enabled: boolean) => {
    setAutoReply(enabled);
    session.manager.send({
      type: 'control',
      data: {
        action: 'livestream_set_auto_reply',
        enabled,
        client_id: session.manager.getClientId(),
        timestamp: new Date().toISOString()
      }
    });
  };

  const updatePolicies = (next: Record<string, boolean>) => {
    setPolicies(next);
    session.manager.send({
      type: 'control',
      data: {
        action: 'livestream_update_policy',
        policies: next,
        client_id: session.manager.getClientId(),
        timestamp: new Date().toISOString()
      }
    });
  };

  return (
    <AppShell
      mode="douyin-live"
      connectionState={session.connectionState}
      statusItems={
        <Tag color={autoReply ? 'green' : 'orange'}>
          {autoReply ? '自动回复中' : '已暂停'}
        </Tag>
      }
      stage={
        <DigitalHumanStage
          subtitle={session.latestAssistantText}
          thinking={session.isThinking}
        />
      }
    >
      <div className="live-console">
        <section className="live-control-strip glass-panel">
          <div>
            <strong>直播互动</strong>
            <span>先在弹幕采集器中连接房间并填写当前后端 WS 地址</span>
          </div>
          <Button
            icon={<ExportOutlined />}
            onClick={() => window.open(getDycastUrl(), '_blank')}
          >
            打开弹幕采集器
          </Button>
          <Link to="/live/stage" target="_blank">
            <Button type="primary">打开 OBS 舞台</Button>
          </Link>
          <Button
            danger={!autoReply}
            icon={autoReply ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => setAutoReplyEnabled(!autoReply)}
          >
            {autoReply ? '暂停自动回复' : '恢复自动回复'}
          </Button>
        </section>

        <div className="live-console__grid">
          <section className="live-feed glass-panel">
            <div className="panel-title">
              <div>
                <strong>实时事件</strong>
                <span>最多显示最近 100 条</span>
              </div>
              <Button
                type="text"
                icon={<ClearOutlined />}
                onClick={() => setEvents([])}
              />
            </div>
            <div className="live-stat-row">
              <Tag>评论 {stats.WebcastChatMessage ?? 0}</Tag>
              <Tag>进入 {stats.WebcastMemberMessage ?? 0}</Tag>
              <Tag>关注 {stats.WebcastSocialMessage ?? 0}</Tag>
              <Tag>点赞 {stats.WebcastLikeMessage ?? 0}</Tag>
            </div>
            <div className="live-event-list">
              {events.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="等待 dycast 转发直播事件"
                />
              ) : (
                events.map((event, index) => (
                  <div className="live-event" key={event.id ?? `${index}`}>
                    <Tag>{event.method?.replace('Webcast', '').replace('Message', '')}</Tag>
                    <strong>{event.user?.name ?? '观众'}</strong>
                    <span>
                      {event.content ||
                        (event.gift
                          ? `赠送 ${event.gift.name ?? '礼物'} × ${event.gift.count ?? 1}`
                          : '触发互动事件')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="live-policy glass-panel">
            <div className="panel-title">
              <div>
                <strong>自动回复策略</strong>
                <span>控制后端处理哪些直播事件</span>
              </div>
              <Switch checked={autoReply} onChange={setAutoReplyEnabled} />
            </div>
            <div className="policy-list">
              {Object.entries(policyLabels).map(([key, label]) => (
                <Checkbox
                  key={key}
                  checked={policies[key]}
                  onChange={event =>
                    updatePolicies({ ...policies, [key]: event.target.checked })
                  }
                >
                  {label}自动互动
                </Checkbox>
              ))}
            </div>
            <p className="capability-note">
              点赞、进入等高频事件由后端按批次处理；复杂优先级队列将在下一阶段接入持久化任务队列。
            </p>
          </section>
        </div>

        <ConversationPanel
          messages={session.messages}
          connected={session.isConnected}
          thinking={session.isThinking}
          audioEnabled={session.audioEnabled}
          onAudioEnabledChange={session.setAudioEnabled}
          onSend={session.sendText}
          onClear={session.clearMessages}
          title="主播手动插播"
        />
      </div>
    </AppShell>
  );
};
