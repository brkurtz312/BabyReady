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

export const firebaseEmulatorConfig = {
  enabled: booleanValue(process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS),
  host: value(process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST) || '127.0.0.1',
  authPort: integerValue(process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT, 9099),
  firestorePort: integerValue(process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT, 8080),
  functionsPort: integerValue(process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT, 5001),
};

/**
 * The Edinburgh Postnatal Depression Scale self-check. Off unless
 * EXPO_PUBLIC_ENABLE_EPDS is "true": the scale is copyright of the Royal College
 * of Psychiatrists, and it stays off until permission to use it in the app is
 * confirmed.
 */
export const epdsEnabled = booleanValue(process.env.EXPO_PUBLIC_ENABLE_EPDS);

/**
 * The full-class purchase. Off unless EXPO_PUBLIC_ENABLE_PAYWALL is "true";
 * while off, every lesson is open. The RevenueCat keys are public SDK keys
 * (appl_… for iOS, goog_… for Android), safe to ship in the app.
 */
export const paywallEnabled = booleanValue(process.env.EXPO_PUBLIC_ENABLE_PAYWALL);
export const revenueCatKeys = {
  ios: value(process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY),
  android: value(process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY),
};
