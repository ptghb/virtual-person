import { expect, test } from '@playwright/test';

test('主动关心设置会持久化', async ({ page }) => {
  await page.goto('/settings');
  const card = page.getByTestId('proactive-settings');
  await expect(card).toBeVisible();

  await card.getByLabel('主动关心频率').selectOption('24');
  await card.getByLabel('安静时段开始').selectOption('22');
  await card.getByLabel('安静时段结束').selectOption('9');

  await page.reload();
  await expect(card.getByLabel('主动关心频率')).toHaveValue('24');
  await expect(card.getByLabel('安静时段开始')).toHaveValue('22');
  await expect(card.getByLabel('安静时段结束')).toHaveValue('9');
});

test('升级模式提供自动聆听入口', async ({ page }) => {
  await page.goto('/advanced');
  await expect(page.getByRole('button', { name: '自动聆听' })).toBeVisible();
});

test('语音检测参数会持久化', async ({ page }) => {
  await page.goto('/settings');
  const card = page.getByTestId('voice-settings');
  await card.getByLabel('语音检测灵敏度').selectOption('high');
  await card.getByLabel('静音多久结束录音').selectOption('1200');
  await page.reload();
  await expect(card.getByLabel('语音检测灵敏度')).toHaveValue('high');
  await expect(card.getByLabel('静音多久结束录音')).toHaveValue('1200');
});

test('可以授权并选择模拟麦克风', async ({ page }) => {
  await page.addInitScript(() => {
    const track = { stop: () => undefined };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [track]
        }),
        enumerateDevices: async () => [
          {
            deviceId: 'mock-microphone',
            groupId: 'mock-group',
            kind: 'audioinput',
            label: '测试麦克风',
            toJSON: () => ({})
          }
        ]
      }
    });
  });
  await page.goto('/settings');
  const card = page.getByTestId('voice-settings');
  await card.getByRole('button', { name: '检测并授权' }).click();
  await expect(card.getByText('已授权，发现 1 个设备')).toBeVisible();
  await card.getByLabel('麦克风输入设备').selectOption('mock-microphone');
  await page.reload();
  await expect(card.getByLabel('麦克风输入设备')).toHaveValue(
    'mock-microphone'
  );
});

test('提醒页可以授权浏览器通知', async ({ page }) => {
  await page.addInitScript(() => {
    class MockNotification {
      static permission: NotificationPermission = 'default';

      static async requestPermission(): Promise<NotificationPermission> {
        MockNotification.permission = 'granted';
        return 'granted';
      }
    }
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: MockNotification
    });
  });
  await page.route('**/api/reminders?**', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0 })
    })
  );

  await page.goto('/settings');
  const card = page.getByTestId('reminder-settings');
  await expect(card).toBeVisible();
  await expect(card.getByText('通知尚未授权')).toBeVisible();
  await card.getByRole('button', { name: '开启到期通知' }).click();
  await expect(card.getByText('通知已开启')).toBeVisible();
});
