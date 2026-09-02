import { getBackendApiUrl } from '../config';

export interface LivestreamEventPayload {
  comments: unknown[];
  source?: string;
}

export interface DouyinStatusResponse {
  status: 'success' | 'error';
  data?: Record<string, unknown>;
  message?: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(getBackendApiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const livestreamApi = {
  pushEvents(payload: LivestreamEventPayload) {
    return postJson<DouyinStatusResponse>('/api/livestream/events', payload);
  },
  startDouyin(roomNum: string) {
    return postJson<DouyinStatusResponse>('/api/livestream/douyin/start', { room_num: roomNum });
  },
  stopDouyin() {
    return postJson<DouyinStatusResponse>('/api/livestream/douyin/stop', {});
  },
  async getDouyinStatus() {
    const response = await fetch(getBackendApiUrl('/api/livestream/douyin/status'));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json() as Promise<DouyinStatusResponse>;
  }
};
