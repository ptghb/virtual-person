import { ModelDir } from '../lappdefine';

const STORAGE_KEY = 'ai-girlfriend.avatar-model.v1';
export const DEFAULT_AVATAR_MODEL = 'Hiyori';

export function getSelectedAvatarModel(): string {
  if (typeof window === 'undefined') return DEFAULT_AVATAR_MODEL;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored && ModelDir.includes(stored) ? stored : DEFAULT_AVATAR_MODEL;
}

export function setSelectedAvatarModel(modelName: string): void {
  if (!ModelDir.includes(modelName)) return;
  window.localStorage.setItem(STORAGE_KEY, modelName);
}
