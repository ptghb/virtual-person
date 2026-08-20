export type MemoryType =
  | 'fact'
  | 'preference'
  | 'pinned'
  | 'summary'
  | 'boundary'
  | 'event'
  | 'followup'
  | 'relationship';

export type MemoryStatus =
  | 'active'
  | 'superseded'
  | 'deleted'
  | 'archived'
  | 'pending_confirm';

export interface MemoryItem {
  id: string;
  user_id: string;
  companion_id: string;
  session_id?: string | null;
  memory_type: MemoryType;
  status: MemoryStatus;
  title?: string | null;
  content: string;
  importance: number;
  confidence: number;
  source_type: string;
  normalized_json?: Record<string, unknown> | null;
  ttl_at?: string | null;
  updated_at: string;
  created_at: string;
  deleted_at?: string | null;
}

export interface MemoryListResponse {
  items: MemoryItem[];
  total: number;
}

export interface CreateMemoryPayload {
  user_id: string;
  companion_id: string;
  session_id?: string;
  memory_type: Extract<MemoryType, 'pinned'>;
  title?: string;
  content: string;
  importance?: number;
}

export interface UpdateMemoryPayload {
  title?: string;
  content?: string;
  importance?: number;
  status?: MemoryStatus;
}
