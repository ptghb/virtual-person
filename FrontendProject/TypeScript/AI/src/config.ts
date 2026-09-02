/**
 * 应用配置文件
 */

const isBrowser = typeof window !== 'undefined';
const pageProtocol = isBrowser ? window.location.protocol : 'http:';
const pageHostname = isBrowser ? window.location.hostname : 'localhost';
const pageHost = isBrowser ? window.location.host : 'localhost';
const isLocalFrontend =
  isBrowser && document.querySelector('script[src="/@vite/client"]') !== null;
const wsProtocol = pageProtocol === 'https:' ? 'wss:' : 'ws:';
const httpProtocol = pageProtocol === 'https:' ? 'https:' : 'http:';

// 本地 Vite 开发时后端使用 8000；部署后默认使用同源 Nginx。
const backendHost = isLocalFrontend ? `${pageHostname}:8000` : pageHost;

// 后端服务配置
export const BACKEND_CONFIG = {
  // WebSocket 连接地址
  WS_URL: `${wsProtocol}//${backendHost}`,

  // HTTP API 基础地址
  API_BASE_URL: `${httpProtocol}//${backendHost}`,

  // TTS 服务端点
  TTS_ENDPOINT: '/api/v1/tts/generate'
} as const;

// 图片配置
export const IMAGE_CONFIG = {
  // 支持的图片格式
  SUPPORTED_FORMATS: ['jpeg', 'png', 'gif', 'webp'] as const,

  // 默认图片格式
  DEFAULT_FORMAT: 'jpeg' as const,

  // 图片质量 (0-1)
  QUALITY: 0.8,

  // 最大图片尺寸 (像素)
  MAX_WIDTH: 1920,
  MAX_HEIGHT: 1080,

  // 最大文件大小 (字节) - 5MB
  MAX_FILE_SIZE: 5 * 1024 * 1024
} as const;

// 获取完整的 WebSocket 连接地址
export const getWebSocketUrl = (clientId: string): string => {
  return `${BACKEND_CONFIG.WS_URL}/ws/${clientId}`;
};

// 获取完整的 TTS API 地址
export const getTTSApiUrl = (): string => {
  return `${BACKEND_CONFIG.API_BASE_URL}${BACKEND_CONFIG.TTS_ENDPOINT}`;
};

export const getBackendApiUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${BACKEND_CONFIG.API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

