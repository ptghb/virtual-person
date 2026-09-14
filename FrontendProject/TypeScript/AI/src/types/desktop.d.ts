interface DesktopBridge {
  isDesktop: boolean;
  getBackendStatus: () => Promise<{ ok: boolean; url: string; status: number }>;
  startBackend: () => Promise<{ ok: boolean; output: string; error: string }>;
  stopBackend: () => Promise<{ ok: boolean; output: string; error: string }>;
  setAlwaysOnTop: (enabled: boolean) => Promise<boolean>;
  setClickThrough: (enabled: boolean) => Promise<boolean>;
  getPosition: () => Promise<[number, number]>;
  moveWindow: (x: number, y: number) => Promise<boolean>;
  openChat: () => Promise<void>;
  openSettings: () => Promise<void>;
  minimize: () => Promise<void>;
  close: () => Promise<void>;
}

declare global {
  interface Window {
    desktop?: DesktopBridge;
  }
}

export {};
