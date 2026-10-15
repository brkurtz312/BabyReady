import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import * as FirebaseAuth from 'firebase/auth';
import {
  connectFunctionsEmulator,
  getFunctions,
  type Functions,
} from 'firebase/functions';
import type { Auth, Persistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  firebaseEmulatorConfig,
  firebaseOptions,
  isFirebaseConfigured,
} from '../config/env';

export const firebaseIsConfigured = isFirebaseConfigured;

function createFirebaseApp(): FirebaseApp | null {
  if (!firebaseIsConfigured) {
    return null;
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseOptions);
}

export const firebaseApp = createFirebaseApp();

function createAuth(app: FirebaseApp): Auth {
  if (Platform.OS === 'web') {
    return FirebaseAuth.getAuth(app);
  }

  try {
    // firebase/auth re-exports the React Native implementation at runtime
    // through Metro's "react-native" package condition. The web TypeScript
    // declarations intentionally omit this RN-only helper, so this narrow
    // adapter preserves type safety without importing Firebase internals.
    const reactNativeAuth = FirebaseAuth as typeof FirebaseAuth & {
      getReactNativePersistence: (
        storage: typeof AsyncStorage,
      ) => Persistence;
    };

    return FirebaseAuth.initializeAuth(app, {
      persistence: reactNativeAuth.getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Hot reload and development re-entry can initialize Auth more than once.
    return FirebaseAuth.getAuth(app);
  }
}

export const auth: Auth | null = firebaseApp ? createAuth(firebaseApp) : null;
export const db: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
export const functions: Functions | null = firebaseApp ? getFunctions(firebaseApp) : null;

if (firebaseEmulatorConfig.enabled && auth && db) {
  const authEmulatorUrl = `http://${firebaseEmulatorConfig.host}:${firebaseEmulatorConfig.authPort}`;

  try {
    FirebaseAuth.connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
  } catch {
    // The emulator may already be connected after a hot reload.
  }

  try {
    connectFirestoreEmulator(
      db,
      firebaseEmulatorConfig.host,
      firebaseEmulatorConfig.firestorePort,
    );
  } catch {
    // The emulator may already be connected after a hot reload.
  }

  if (functions) {
    try {
      connectFunctionsEmulator(functions, firebaseEmulatorConfig.host, firebaseEmulatorConfig.functionsPort);
    } catch {
      // The emulator may already be connected after a hot reload.
    }
  }
}

export function requireFirestore(): Firestore {
  if (!db) {
    throw new Error(
      'Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* values to .env before using Firestore services.',
    );
  }

  return db;
}

export function requireAuth(): Auth {
  if (!auth) {
    throw new Error(
      'Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* values to .env before using Firebase Authentication.',
    );
  }

  return auth;
}
