import { getBackendApiUrl } from '../config';
import type {
  CreateMemoryPayload,
  MemoryListResponse,
  MemoryStatus,
  UpdateMemoryPayload
} from './memory.types';

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `请求失败: ${response.status}`);
  }

  return (await response.json()) as T;
}

export const memoryService = {
  listMemories(
    userId: string,
    companionId: string,
    memoryType?: string,
    status: MemoryStatus = 'active'
  ) {
    const search = new URLSearchParams({
      user_id: userId,
      companion_id: companionId,
      status,
      limit: '50'
    });
    if (memoryType) {
      search.set('memory_type', memoryType);
    }
    return request<MemoryListResponse>(
      getBackendApiUrl(`/api/memories?${search.toString()}`)
    );
  },

  createMemory(payload: CreateMemoryPayload) {
    return request<{ id: string; status: string }>(
      getBackendApiUrl('/api/memories'),
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
  },

  updateMemory(memoryId: string, payload: UpdateMemoryPayload) {
    return request<{ id: string; status: string }>(
      getBackendApiUrl(`/api/memories/${memoryId}`),
      {
        method: 'PATCH',
        body: JSON.stringify(payload)
      }
    );
  },

  deleteMemory(memoryId: string) {
    return request<{ id: string; status: string }>(
      getBackendApiUrl(`/api/memories/${memoryId}`),
      {
        method: 'DELETE'
      }
    );
  }
};
