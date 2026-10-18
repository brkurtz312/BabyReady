import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';

import { auth, functions } from '../lib/firebase';
import { signOutFromBabyReady } from './authService';
import { clearDeviceReflections } from './birthReadinessReflectionService';
import { clearDeviceProgress } from './learnerProgressService';

export type DeleteDataResult = { ok: true } | { ok: false; message: string };

const TRY_AGAIN = 'Your data couldn’t be deleted just now. Check your connection and try again.';

/**
 * Deletes everything BabyReady keeps for this learner.
 *
 * With a Firebase session, the server deletes everything under users/{uid} and
 * the sign-in itself first. If that fails, nothing on the device is touched, so
 * the learner can simply try again. Then the device copies are cleared and the
 * app signs out, which starts a new, empty private session.
 */
export async function deleteMyData(userId: string | null): Promise<DeleteDataResult> {
  if (userId && functions) {
    try {
      await httpsCallable<void, { deleted: boolean }>(functions, 'deleteMyAccount')();
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'functions/unauthenticated') {
        return { ok: false, message: 'BabyReady is still starting your private session. Try again in a moment.' };
      }
      return { ok: false, message: TRY_AGAIN };
    }
  }

  try {
    await Promise.all([clearDeviceProgress(), clearDeviceReflections()]);
  } catch {
    return { ok: false, message: 'Your account data was deleted, but this device’s copy couldn’t be cleared. Try again.' };
  }

  if (auth) await signOutFromBabyReady().catch(() => undefined);
  return { ok: true };
}
