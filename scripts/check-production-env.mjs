import { loadProductionEnvironment } from './production-env.mjs';

loadProductionEnvironment();

const requiredEnvironmentNames = [
  'FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

const missingEnvironmentNames = requiredEnvironmentNames.filter(
  (name) => !process.env[name]?.trim(),
);

if (missingEnvironmentNames.length > 0) {
  console.error(
    `Production deployment blocked: missing ${missingEnvironmentNames.join(', ')}.`,
  );
  console.error(
    'Copy .env.production.example to .env, populate the public Firebase web configuration, then retry.',
  );
  process.exit(1);
}

if (
  process.env.FIREBASE_PROJECT_ID?.trim() !==
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim()
) {
  console.error(
    'Production deployment blocked: FIREBASE_PROJECT_ID must match EXPO_PUBLIC_FIREBASE_PROJECT_ID.',
  );
  process.exit(1);
}

if (
  process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS?.trim().toLowerCase() ===
  'true'
) {
  console.error(
    'Production deployment blocked: EXPO_PUBLIC_USE_FIREBASE_EMULATORS must be false.',
  );
  process.exit(1);
}

console.log(
  `Production environment validated for Firebase project ${process.env.FIREBASE_PROJECT_ID?.trim()}.`,
);
