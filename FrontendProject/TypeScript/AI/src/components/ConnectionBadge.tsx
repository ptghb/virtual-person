import React from 'react';
import type { ConnectionState } from '../websocketmanager';

const labels: Record<ConnectionState, string> = {
  connected: '已连接',
  connecting: '连接中',
  disconnected: '未连接',
  error: '连接异常'
};

export const ConnectionBadge: React.FC<{ state: ConnectionState }> = ({
  state
}) => (
  <span className={`connection-badge connection-badge--${state}`}>
    <span className="connection-badge__dot" />
    {labels[state]}
  </span>
);
