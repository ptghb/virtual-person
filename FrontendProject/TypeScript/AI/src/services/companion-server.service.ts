import { getBackendApiUrl } from '../config';
import { getCompanionProfile } from './companion-profile.service';
import { getUserIdentity } from './user-identity.service';

interface SyncCompanionOptions {
  companionId: string;
  mode?: string;
}

export async function syncCompanionToServer({
  companionId,
  mode = 'desktop'
}: SyncCompanionOptions): Promise<void> {
  const profile = getCompanionProfile();
  const identity = getUserIdentity();

  const response = await fetch(getBackendApiUrl('/api/companions/current'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: identity.userId,
      session_id: identity.sessionId,
      companion_id: companionId,
      name: profile.name,
      personality: profile.personality,
      mode
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}
