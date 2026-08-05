import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

import { firebaseOptions, isFirebaseConfigured } from '../config/env';

export const firebaseIsConfigured = isFirebaseConfigured;

function createFirebaseApp(): FirebaseApp | null {
  if (!firebaseIsConfigured) {
    return null;
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseOptions);
}

export const firebaseApp = createFirebaseApp();
export const db: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;

export function requireFirestore(): Firestore {
  if (!db) {
    throw new Error(
      'Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* values to .env before using Firestore services.',
    );
  }

  return db;
}
