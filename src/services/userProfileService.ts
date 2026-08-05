import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

import { requireFirestore } from '../lib/firebase';

export type BabyReadyUserProfile = {
  uid: string;
  isAnonymous: boolean;
  createdAt?: unknown;
  lastSignedInAt?: unknown;
};

export async function ensureUserProfile(user: User): Promise<void> {
  const db = requireFirestore();
  const profileReference = doc(db, 'users', user.uid);

  await setDoc(
    profileReference,
    {
      uid: user.uid,
      isAnonymous: user.isAnonymous,
      createdAt: serverTimestamp(),
      lastSignedInAt: serverTimestamp(),
    } satisfies BabyReadyUserProfile,
    { merge: true },
  );
}
