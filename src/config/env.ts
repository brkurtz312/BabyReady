import type { FirebaseOptions } from 'firebase/app';

type FirebaseEnvironment = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const value = (name: string): string => process.env[name]?.trim() ?? '';
const booleanValue = (name: string): boolean => value(name).toLowerCase() === 'true';
const integerValue = (name: string, fallback: number): number => {
  const parsed = Number.parseInt(value(name), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const firebaseConfig: FirebaseEnvironment = {
  apiKey: value('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: value('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: value('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: value('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: value('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: value('EXPO_PUBLIC_FIREBASE_APP_ID'),
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

export const firebaseOptions: FirebaseOptions = firebaseConfig;

export const firebaseEmulatorConfig = {
  enabled: booleanValue('EXPO_PUBLIC_USE_FIREBASE_EMULATORS'),
  host: value('EXPO_PUBLIC_FIREBASE_EMULATOR_HOST') || '127.0.0.1',
  authPort: integerValue('EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT', 9099),
  firestorePort: integerValue('EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT', 8080),
};
