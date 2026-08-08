import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type Unsubscribe,
  type User,
} from 'firebase/auth';

import { auth, requireAuth } from '../lib/firebase';
import { ensureUserProfile } from './userProfileService';

export type AuthState =
  | { status: 'unconfigured'; user: null; error: null }
  | { status: 'loading'; user: User | null; error: null }
  | { status: 'ready'; user: User; error: null }
  | { status: 'error'; user: null; error: string };

function readableAuthError(error: unknown): string {
  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message);
  }

  return 'BabyReady could not sign in. Please try again or contact support.';
}

async function provisionProfile(user: User): Promise<void> {
  try {
    await ensureUserProfile(user);
  } catch {
    // Authentication remains valid even if an offline device cannot reach
    // Firestore yet. The next app session will retry profile provisioning.
  }
}

function provisionProfileInBackground(user: User): void {
  void provisionProfile(user);
}

export function subscribeToBabyReadyAuth(
  onStateChange: (state: AuthState) => void,
): Unsubscribe | null {
  const babyReadyAuth = auth;
  if (!babyReadyAuth) {
    onStateChange({ status: 'unconfigured', user: null, error: null });
    return null;
  }

  onStateChange({ status: 'loading', user: babyReadyAuth.currentUser, error: null });

  return onAuthStateChanged(babyReadyAuth, async (user) => {
    if (user) {
      onStateChange({ status: 'ready', user, error: null });
      provisionProfileInBackground(user);
      return;
    }

    try {
      const credential = await signInAnonymously(babyReadyAuth);
      onStateChange({ status: 'ready', user: credential.user, error: null });
      provisionProfileInBackground(credential.user);
    } catch (error) {
      onStateChange({ status: 'error', user: null, error: readableAuthError(error) });
    }
  });
}

export async function registerWithEmail(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(requireAuth(), email, password);
  provisionProfileInBackground(credential.user);
  return credential.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(requireAuth(), email, password);
  provisionProfileInBackground(credential.user);
  return credential.user;
}

export async function signOutFromBabyReady(): Promise<void> {
  await signOut(requireAuth());
}
