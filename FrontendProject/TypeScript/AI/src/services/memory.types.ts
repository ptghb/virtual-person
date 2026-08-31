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

export interface TimelineEvent {
  id: string;
  user_id: string;
  companion_id: string;
  session_id?: string | null;
  event_type: string;
  title?: string | null;
  content: string;
  emotional_valence: string;
  importance: number;
  source_memory_id?: string | null;
  source_type: string;
  occurred_at: string;
  detected_at: string;
  created_at: string;
}

export interface TimelineListResponse {
  items: TimelineEvent[];
  total: number;
}

export interface TimelineDaySummary {
  date: string;
  summary: string;
  event_count: number;
  highlights: string[];
  last_occurred_at?: string | null;
}

export interface TimelineDayListResponse {
  items: TimelineDaySummary[];
  total: number;
}
