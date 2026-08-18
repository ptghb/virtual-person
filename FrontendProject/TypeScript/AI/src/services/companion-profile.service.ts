import { useSyncExternalStore } from 'react';

export interface CompanionProfile {
  name: string;
  personality: string;
}

export const DEFAULT_COMPANION_PROFILE: CompanionProfile = {
  name: '小凡',
  personality:
    '温柔体贴、善于倾听，能理解我的情绪并给予支持；说话亲切自然、轻松活泼，像亲密的朋友一样，不过分正式或机械。'
};

const STORAGE_KEY = 'ai-girlfriend.companion-profile.v1';
const listeners = new Set<() => void>();

function normalizeProfile(value?: Partial<CompanionProfile>): CompanionProfile {
  const name = value?.name?.trim().replace(/\s+/g, ' ').slice(0, 20);
  const personality = value?.personality?.trim().slice(0, 500);
  return {
    name: name || DEFAULT_COMPANION_PROFILE.name,
    personality: personality || DEFAULT_COMPANION_PROFILE.personality
  };
}

function readStoredProfile(): CompanionProfile {
  if (typeof window === 'undefined') return DEFAULT_COMPANION_PROFILE;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored
      ? normalizeProfile(JSON.parse(stored) as Partial<CompanionProfile>)
      : DEFAULT_COMPANION_PROFILE;
  } catch {
    return DEFAULT_COMPANION_PROFILE;
  }
}

let currentProfile = readStoredProfile();

function updateDocumentTitle() {
  if (typeof document !== 'undefined') {
    document.title = `${currentProfile.name} AI`;
  }
}

function emitChange() {
  updateDocumentTitle();
  listeners.forEach(listener => listener());
}

export function getCompanionProfile(): CompanionProfile {
  return currentProfile;
}

export function setCompanionProfile(profile: CompanionProfile): void {
  currentProfile = normalizeProfile(profile);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentProfile));
  emitChange();
}

export function resetCompanionProfile(): void {
  currentProfile = DEFAULT_COMPANION_PROFILE;
  window.localStorage.removeItem(STORAGE_KEY);
  emitChange();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  updateDocumentTitle();
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) {
      currentProfile = readStoredProfile();
      emitChange();
    }
  });
}

export function useCompanionProfile() {
  const profile = useSyncExternalStore(
    subscribe,
    getCompanionProfile,
    () => DEFAULT_COMPANION_PROFILE
  );
  return { profile, setCompanionProfile, resetCompanionProfile };
}
