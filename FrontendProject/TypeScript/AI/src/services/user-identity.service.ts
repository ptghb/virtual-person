import { useSyncExternalStore } from 'react';

export interface UserIdentity {
  userId: string;
  sessionId: string;
}

const USER_STORAGE_KEY = 'ai-girlfriend.user-id.v1';
const SESSION_STORAGE_KEY = 'ai-girlfriend.session-id.v1';
const SERVER_IDENTITY: UserIdentity = {
  userId: 'user_server',
  sessionId: 'session_server'
};
const listeners = new Set<() => void>();

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
}

function writeStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value);
}

function ensureStoredId(key: string, prefix: string): string {
  const existing = readStorage(key);
  if (existing) return existing;
  const created = createId(prefix);
  writeStorage(key, created);
  return created;
}

function emitChange() {
  listeners.forEach(listener => listener());
}

function readIdentitySnapshot(): UserIdentity {
  return {
    userId: ensureStoredId(USER_STORAGE_KEY, 'user'),
    sessionId: ensureStoredId(SESSION_STORAGE_KEY, 'session')
  };
}

let currentIdentity: UserIdentity =
  typeof window === 'undefined' ? SERVER_IDENTITY : readIdentitySnapshot();

function syncIdentitySnapshot(): UserIdentity {
  if (typeof window === 'undefined') {
    return SERVER_IDENTITY;
  }

  const nextIdentity = readIdentitySnapshot();
  if (
    currentIdentity.userId === nextIdentity.userId &&
    currentIdentity.sessionId === nextIdentity.sessionId
  ) {
    return currentIdentity;
  }

  currentIdentity = nextIdentity;
  return currentIdentity;
}

export function getUserIdentity(): UserIdentity {
  return syncIdentitySnapshot();
}

export function rotateSessionId(): string {
  const nextSessionId = createId('session');
  writeStorage(SESSION_STORAGE_KEY, nextSessionId);
  currentIdentity = {
    ...syncIdentitySnapshot(),
    sessionId: nextSessionId
  };
  emitChange();
  return nextSessionId;
}

export function resetUserIdentity(): UserIdentity {
  const userId = createId('user');
  const sessionId = createId('session');
  writeStorage(USER_STORAGE_KEY, userId);
  writeStorage(SESSION_STORAGE_KEY, sessionId);
  currentIdentity = { userId, sessionId };
  emitChange();
  return { userId, sessionId };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (
      event.key === USER_STORAGE_KEY ||
      event.key === SESSION_STORAGE_KEY
    ) {
      syncIdentitySnapshot();
      emitChange();
    }
  });
}

export function useUserIdentity() {
  const identity = useSyncExternalStore(
    subscribe,
    getUserIdentity,
    () => SERVER_IDENTITY
  );

  return {
    identity,
    getUserIdentity,
    rotateSessionId,
    resetUserIdentity
  };
}
