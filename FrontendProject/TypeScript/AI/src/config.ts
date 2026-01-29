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

// 获取完整的 WebSocket 连接地址
export const getWebSocketUrl = (clientId: string): string => {
  return `${BACKEND_CONFIG.WS_URL}/ws/${clientId}`;
};

// 获取完整的 TTS API 地址
export const getTTSApiUrl = (): string => {
  return `${BACKEND_CONFIG.API_BASE_URL}${BACKEND_CONFIG.TTS_ENDPOINT}`;
};
