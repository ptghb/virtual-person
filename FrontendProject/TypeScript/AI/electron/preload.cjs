const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  getBackendStatus: () => ipcRenderer.invoke('backend:status'),
  startBackend: () => ipcRenderer.invoke('backend:start'),
  stopBackend: () => ipcRenderer.invoke('backend:stop'),
  setAlwaysOnTop: enabled => ipcRenderer.invoke('window:always-on-top', enabled),
  setClickThrough: enabled => ipcRenderer.invoke('window:click-through', enabled),
  getPosition: () => ipcRenderer.invoke('window:get-position'),
  moveWindow: (x, y) => ipcRenderer.invoke('window:move', x, y),
  openChat: () => ipcRenderer.invoke('window:open-chat'),
  openSettings: () => ipcRenderer.invoke('window:open-settings'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close')
});
