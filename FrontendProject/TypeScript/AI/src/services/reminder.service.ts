import { getBackendApiUrl } from '../config';

export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Reminder {
  id: string;
  user_id: string;
  companion_id: string;
  title: string;
  due_at: string;
  recurrence: ReminderRecurrence;
  status: 'active' | 'completed' | 'notified';
  source_type: string;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  last_notified_at?: string | null;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getBackendApiUrl(url), {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init
  });
  if (!response.ok) throw new Error((await response.text()) || '提醒请求失败');
  return response.json() as Promise<T>;
}

export const reminderService = {
  list(userId: string, companionId: string, status = 'active') {
    const search = new URLSearchParams({
      user_id: userId,
      companion_id: companionId,
      status
    });
    return request<{ items: Reminder[]; total: number }>(
      `/api/reminders?${search}`
    );
  },
  due(userId: string, companionId: string) {
    const search = new URLSearchParams({
      user_id: userId,
      companion_id: companionId
    });
    return request<{ items: Reminder[]; total: number }>(
      `/api/reminders/due?${search}`
    );
  },
  create(payload: {
    user_id: string;
    companion_id: string;
    title: string;
    due_at: string;
    recurrence: ReminderRecurrence;
  }) {
    return request<{ data: Reminder }>('/api/reminders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  complete(id: string) {
    return request<{ data: Reminder }>(`/api/reminders/${id}/complete`, {
      method: 'POST'
    });
  },
  notified(id: string) {
    return request<{ data: Reminder }>(`/api/reminders/${id}/notified`, {
      method: 'POST'
    });
  },
  remove(id: string) {
    return request<{ id: string; status: string }>(`/api/reminders/${id}`, {
      method: 'DELETE'
    });
  }
};
