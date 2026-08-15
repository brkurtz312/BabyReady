import type { FirebaseOptions } from 'firebase/app';

type FirebaseEnvironment = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const value = (environmentValue: string | undefined): string => environmentValue?.trim() ?? '';
const booleanValue = (environmentValue: string | undefined): boolean =>
  value(environmentValue).toLowerCase() === 'true';
const integerValue = (environmentValue: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value(environmentValue), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const firebaseConfig: FirebaseEnvironment = {
  apiKey: value(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
  authDomain: value(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: value(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: value(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: value(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: value(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

export const firebaseOptions: FirebaseOptions = firebaseConfig;

// This is a public HTTPS endpoint, not a provider secret. The service itself
// verifies the caller's Firebase token and holds any AI-provider credentials.
export const mediaIntakeWorkerUrl = value(
  process.env.EXPO_PUBLIC_MEDIA_INTAKE_WORKER_URL,
);

export const firebaseEmulatorConfig = {
  enabled: booleanValue(process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS),
  host: value(process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST) || '127.0.0.1',
  authPort: integerValue(process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT, 9099),
  firestorePort: integerValue(process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT, 8080),
};
