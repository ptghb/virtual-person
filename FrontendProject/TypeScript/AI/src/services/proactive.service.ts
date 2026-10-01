import { getBackendApiUrl } from '../config';

export interface ProactiveCheckIn {
  id: string;
  user_id: string;
  companion_id: string;
  kind: 'followup' | 'welcome_back' | string;
  content: string;
  status: 'offered' | 'displayed' | 'dismissed' | string;
  source_type: string;
  source_ref?: string | null;
  created_at: string;
  displayed_at?: string | null;
  dismissed_at?: string | null;
}

export interface ProactiveCheckInResponse {
  data: ProactiveCheckIn | null;
  reason: string;
}

export const proactiveService = {
  async getCheckIn(
    userId: string,
    companionId: string,
    localHour: number,
    cooldownHours = 12
  ): Promise<ProactiveCheckInResponse> {
    const search = new URLSearchParams({
      user_id: userId,
      companion_id: companionId,
      local_hour: String(localHour),
      cooldown_hours: String(cooldownHours)
    });
    const response = await fetch(
      getBackendApiUrl(`/api/proactive/check-in?${search.toString()}`)
    );
    if (!response.ok) {
      throw new Error(`主动关心加载失败: ${response.status}`);
    }
    return response.json() as Promise<ProactiveCheckInResponse>;
  },

  async acknowledge(
    checkInId: string,
    action: 'displayed' | 'dismissed'
  ): Promise<void> {
    const response = await fetch(
      getBackendApiUrl(`/api/proactive/check-ins/${checkInId}/ack`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      }
    );
    if (!response.ok) {
      throw new Error(`主动关心回执失败: ${response.status}`);
    }
  }
};
