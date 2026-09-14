import { ModelDir } from '../lappdefine';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'ai-girlfriend.avatar-model.v1';
export const DEFAULT_AVATAR_MODEL = 'Hiyori';
const listeners = new Set<() => void>();

export function getSelectedAvatarModel(): string {
  if (typeof window === 'undefined') return DEFAULT_AVATAR_MODEL;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored && ModelDir.includes(stored) ? stored : DEFAULT_AVATAR_MODEL;
}

export function setSelectedAvatarModel(modelName: string): void {
  if (!ModelDir.includes(modelName)) return;
  window.localStorage.setItem(STORAGE_KEY, modelName);
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) {
      listeners.forEach(listener => listener());
    }
  });
}

export function useSelectedAvatarModel(): string {
  return useSyncExternalStore(
    subscribe,
    getSelectedAvatarModel,
    () => DEFAULT_AVATAR_MODEL
  );
}
