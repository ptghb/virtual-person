/**
 * 应用配置文件
 */

// 后端服务配置
export const BACKEND_CONFIG = {
  // WebSocket 连接地址
  WS_URL: 'ws://47.121.30.160:8000',

  // HTTP API 基础地址
  API_BASE_URL: 'http://47.121.30.160:8000',

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
