const { app, BrowserWindow, ipcMain, Menu, screen, shell, Tray } = require('electron');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const isDev = process.argv.includes('--dev');
const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
let mainWindow;
let tray;
let clickThrough = false;

function projectRoot() {
  return path.resolve(__dirname, '../../../..');
}

function runCompose(command) {
  const composeFile = path.join(projectRoot(), 'docker-compose.yml');
  if (!fs.existsSync(composeFile)) {
    return Promise.resolve({
      ok: false,
      output: '',
      error: `未找到 Docker Compose 文件：${composeFile}`
    });
  }
  return new Promise(resolve => {
    const args = ['compose', ...command];
    execFile('docker', args, { cwd: projectRoot(), timeout: 120000 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        output: `${stdout || ''}${stderr || ''}`.trim(),
        error: error ? error.message : ''
      });
    });
  });
}

async function backendStatus() {
  try {
    const response = await fetch(`${backendUrl}/api/health`, { signal: AbortSignal.timeout(2500) });
    return { ok: response.ok, url: backendUrl, status: response.status };
  } catch {
    try {
      const response = await fetch(`${backendUrl}/`, { signal: AbortSignal.timeout(2500) });
      return { ok: response.ok, url: backendUrl, status: response.status };
    } catch {
      return { ok: false, url: backendUrl, status: 0 };
    }
  }
}

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const bounds = display.workArea;
  mainWindow = new BrowserWindow({
    width: 440,
    height: 720,
    minWidth: 360,
    minHeight: 560,
    x: Math.max(bounds.x + bounds.width - 500, bounds.x),
    y: Math.max(bounds.y + 40, bounds.y),
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const target = isDev
    ? 'http://127.0.0.1:8091/#/desktop'
    : `file://${path.join(__dirname, '../dist/index.html')}#/desktop`;
  if (isDev) {
    mainWindow.loadURL(target);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/desktop' });
  }
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/Resources/icon_gear.png');
  if (!fs.existsSync(iconPath)) return;
  tray = new Tray(iconPath);
  tray.setToolTip('小凡 AI');
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: '显示/隐藏人物',
      click: () => {
        if (!mainWindow) return;
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      }
    },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]));
  tray.on('double-click', () => mainWindow?.show());
}

app.whenReady().then(() => {
  ipcMain.handle('backend:status', backendStatus);
  ipcMain.handle('backend:start', () => runCompose(['up', '-d', 'backend', 'tts']));
  ipcMain.handle('backend:stop', () => runCompose(['stop', 'backend', 'tts']));
  ipcMain.handle('window:always-on-top', (_event, enabled) => {
    mainWindow?.setAlwaysOnTop(Boolean(enabled), 'floating');
    return Boolean(enabled);
  });
  ipcMain.handle('window:click-through', (_event, enabled) => {
    clickThrough = Boolean(enabled);
    mainWindow?.setIgnoreMouseEvents(clickThrough, { forward: true });
    return clickThrough;
  });
  ipcMain.handle('window:get-position', () => {
    return mainWindow?.getPosition() || [0, 0];
  });
  ipcMain.handle('window:move', (_event, x, y) => {
    if (!mainWindow || clickThrough) return false;
    const nextX = Number.isFinite(Number(x)) ? Math.round(Number(x)) : 0;
    const nextY = Number.isFinite(Number(y)) ? Math.round(Number(y)) : 0;
    mainWindow.setPosition(nextX, nextY);
    return true;
  });
  ipcMain.handle('window:open-chat', () => {
    if (isDev) return mainWindow?.loadURL('http://127.0.0.1:8091/#/chat');
    return mainWindow?.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/chat' });
  });
  ipcMain.handle('window:open-settings', () => {
    if (isDev) return mainWindow?.loadURL('http://127.0.0.1:8091/#/settings');
    return mainWindow?.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/settings' });
  });
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:close', () => mainWindow?.hide());

  createWindow();
  createTray();
});

app.on('window-all-closed', event => {
  event.preventDefault();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
  else mainWindow.show();
});
