import { useEffect } from 'react';
import { getSelectedAvatarModel } from '../services/avatar-preference.service';
import { reminderService } from '../services/reminder.service';
import { getUserIdentity } from '../services/user-identity.service';

const POLL_MS = 30_000;

export function useReminderMonitor() {
  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      try {
        const identity = getUserIdentity();
        const result = await reminderService.due(
          identity.userId,
          getSelectedAvatarModel()
        );
        for (const reminder of result.items) {
          if (stopped) return;
          let delivered = false;
          if (window.desktop) {
            await window.desktop.showNotification('小凡提醒你', reminder.title);
            delivered = true;
          } else if (
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            new Notification('小凡提醒你', { body: reminder.title });
            delivered = true;
          }
          if (!delivered) continue;
          await reminderService.notified(reminder.id);
          window.dispatchEvent(
            new CustomEvent('xiaofan-reminder', { detail: reminder })
          );
        }
      } catch (error) {
        console.warn('[ReminderMonitor] 检查提醒失败', error);
      }
    };
    void poll();
    const timer = window.setInterval((): void => {
      void poll();
    }, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);
}
