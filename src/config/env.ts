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
