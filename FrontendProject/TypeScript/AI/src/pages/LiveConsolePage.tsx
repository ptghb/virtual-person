import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Checkbox,
  Empty,
  Input,
  Space,
  Switch,
  Tag,
  message,
} from "antd";
import {
  ClearOutlined,
  DisconnectOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  RadarChartOutlined,
} from "@ant-design/icons";
import { AppShell } from "../components/AppShell";
import { ConversationPanel } from "../components/ConversationPanel";
import { DigitalHumanStage } from "../components/DigitalHumanStage";
import { useConversationSession } from "../hooks/useConversationSession";
import { livestreamApi } from "../services/livestreamApi";

interface LiveUser {
  name?: string;
}

interface LiveEvent {
  id?: string;
  method?: string;
  content?: string;
  user?: LiveUser;
  gift?: { name?: string; count?: number | string };
  room?: { likeCount?: number | string; audienceCount?: number | string };
}

const policyLabels: Record<string, string> = {
  chat: "评论",
  member: "进入",
  social: "关注",
  like: "点赞",
  gift: "礼物",
};

const connectStatusLabels: Record<string, { label: string; color: string }> = {
  idle: { label: "未连接", color: "default" },
  starting: { label: "启动中", color: "blue" },
  connecting: { label: "连接中", color: "blue" },
  connected: { label: "采集中", color: "green" },
  warning: { label: "警告", color: "orange" },
  closed: { label: "已断开", color: "orange" },
  error: { label: "连接失败", color: "red" },
};

const validRoomNumber = (value: string) => /^\d{4,30}$/.test(value.trim());

export const LiveConsolePage: React.FC = () => {
  const session = useConversationSession("livestream_console", true);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [autoReply, setAutoReply] = useState(true);
  const [policies, setPolicies] = useState<Record<string, boolean>>({
    chat: true,
    member: true,
    social: true,
    like: true,
    gift: true,
  });
  const [roomNum, setRoomNum] = useState("");
  const [douyinStatus, setDouyinStatus] = useState<Record<string, unknown>>({
    state: "idle",
  });
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          comments?: LiveEvent[];
          settings?: {
            auto_reply_enabled?: boolean;
            policies?: Record<string, boolean>;
          };
        }>
      ).detail;
      if (detail?.comments) {
        setEvents((previous) =>
          [...detail.comments!, ...previous].slice(0, 100),
        );
      }
      if (detail?.settings) {
        setAutoReply(Boolean(detail.settings.auto_reply_enabled));
        if (detail.settings.policies) setPolicies(detail.settings.policies);
      }
    };
    window.addEventListener("livestream-event-batch", handler);
    return () => window.removeEventListener("livestream-event-batch", handler);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail;
      if (detail) setDouyinStatus(detail);
    };
    window.addEventListener("livestream-douyin-status", handler);
    livestreamApi
      .getDouyinStatus()
      .then((result) => {
        if (result.data) setDouyinStatus(result.data);
      })
      .catch((): void => undefined);
    return () =>
      window.removeEventListener("livestream-douyin-status", handler);
  }, []);

  const stats = useMemo(
    () =>
      events.reduce<Record<string, number>>((result, event) => {
        const key = event.method ?? "Unknown";
        result[key] = (result[key] ?? 0) + 1;
        return result;
      }, {}),
    [events],
  );

  const connectLive = async () => {
    const nextRoomNum = roomNum.trim();
    if (!validRoomNumber(nextRoomNum)) {
      messageApi.warning("请输入正确的抖音直播间房间号");
      return;
    }
    try {
      const result = await livestreamApi.startDouyin(nextRoomNum);
      if (result.data) setDouyinStatus(result.data);
      setEvents([]);
      messageApi.success("已请求后端启动抖音直播采集");
    } catch (error) {
      console.error("[LiveConsolePage] 启动后端采集失败:", error);
      messageApi.error(
        `启动采集失败：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const disconnectLive = async () => {
    try {
      const result = await livestreamApi.stopDouyin();
      if (result.data) setDouyinStatus(result.data);
      messageApi.success("已停止后端直播采集");
    } catch (error) {
      console.error("[LiveConsolePage] 停止后端采集失败:", error);
      messageApi.error("停止采集失败");
    }
  };

  const setAutoReplyEnabled = (enabled: boolean) => {
    setAutoReply(enabled);
    session.manager.send({
      type: "control",
      data: {
        action: "livestream_set_auto_reply",
        enabled,
        client_id: session.manager.getClientId(),
        timestamp: new Date().toISOString(),
      },
    });
  };

  const updatePolicies = (next: Record<string, boolean>) => {
    setPolicies(next);
    session.manager.send({
      type: "control",
      data: {
        action: "livestream_update_policy",
        policies: next,
        client_id: session.manager.getClientId(),
        timestamp: new Date().toISOString(),
      },
    });
  };

  const statusKey = String(douyinStatus.state || "idle");
  const statusMeta = connectStatusLabels[statusKey] ?? connectStatusLabels.idle;
  const isDouyinRunning =
    Boolean(douyinStatus.running) ||
    ["starting", "connecting", "connected", "warning"].includes(statusKey);
  const roomInfo = (douyinStatus.room_info || {}) as Record<
    string,
    string | number | undefined
  >;
  const lastError =
    typeof douyinStatus.last_error === "string" ? douyinStatus.last_error : "";
  const transport =
    typeof douyinStatus.transport === "string" ? douyinStatus.transport : "";
  const eventHint = lastError
    ? `采集提示：${lastError}`
    : isDouyinRunning
      ? "已连接，等待直播间新事件"
      : "等待抖音直播间事件";

  return (
    <AppShell
      mode="douyin-live"
      connectionState={session.connectionState}
      statusItems={
        <Space size="small">
          <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
          <Tag color={autoReply ? "green" : "orange"}>
            {autoReply ? "自动回复中" : "已暂停"}
          </Tag>
          {transport ? (
            <Tag color="cyan">
              {transport === "http-polling" ? "HTTP轮询" : "WebSocket"}
            </Tag>
          ) : null}
        </Space>
      }
      stage={
        <DigitalHumanStage
          subtitle={session.latestAssistantText}
          thinking={session.isThinking}
          streaming={session.isStreamingReply}
        />
      }
    >
      {contextHolder}
      <div className="live-console">
        <section className="live-control-strip glass-panel">
          <div>
            <strong>直播互动</strong>
            <span>Python 后端直接采集抖音弹幕并接入直播模块</span>
          </div>
          <Input
            value={roomNum}
            onChange={(event) => setRoomNum(event.target.value)}
            onPressEnter={connectLive}
            disabled={isDouyinRunning}
            placeholder="抖音直播间房间号"
            style={{ width: 180 }}
          />
          <Button
            type="primary"
            icon={<RadarChartOutlined />}
            disabled={isDouyinRunning}
            onClick={connectLive}
          >
            连接直播间
          </Button>
          <Button
            icon={<DisconnectOutlined />}
            disabled={!isDouyinRunning}
            onClick={disconnectLive}
          >
            断开采集
          </Button>
          <Link to="/live/stage" target="_blank">
            <Button>打开 OBS 舞台</Button>
          </Link>
          <Button
            danger={!autoReply}
            icon={autoReply ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => setAutoReplyEnabled(!autoReply)}
          >
            {autoReply ? "暂停自动回复" : "恢复自动回复"}
          </Button>
        </section>

        <div className="live-console__grid">
          <section className="live-feed glass-panel">
            <div className="panel-title">
              <div>
                <strong>实时事件</strong>
                <span>
                  {lastError
                    ? eventHint
                    : roomInfo.nickname
                      ? `${roomInfo.nickname} · ${roomInfo.title ?? ""}`
                      : "最多显示最近 100 条"}
                </span>
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
              <Tag>礼物 {stats.WebcastGiftMessage ?? 0}</Tag>
              {roomInfo.audienceCount ? (
                <Tag>在线 {roomInfo.audienceCount}</Tag>
              ) : null}
              {roomInfo.likeCount ? <Tag>总赞 {roomInfo.likeCount}</Tag> : null}
            </div>
            <div className="live-event-list">
              {events.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={eventHint}
                />
              ) : (
                events.map((event, index) => (
                  <div className="live-event" key={event.id ?? `${index}`}>
                    <Tag>
                      {event.method
                        ?.replace("Webcast", "")
                        .replace("Message", "")}
                    </Tag>
                    <strong>{event.user?.name ?? "观众"}</strong>
                    <span>
                      {event.content ||
                        (event.gift
                          ? `赠送 ${event.gift.name ?? "礼物"} × ${event.gift.count ?? 1}`
                          : event.method === "WebcastLikeMessage"
                            ? `点赞${event.room?.likeCount ? ` · 总赞 ${event.room.likeCount}` : ""}`
                            : "触发互动事件")}
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
                  onChange={(event) =>
                    updatePolicies({ ...policies, [key]: event.target.checked })
                  }
                >
                  {label}自动互动
                </Checkbox>
              ))}
            </div>
            <p className="capability-note">
              当前版本由 Python
              后端常驻采集抖音直播事件；控制台只负责启动、停止和展示。
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
