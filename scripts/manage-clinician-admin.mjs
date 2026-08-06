import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { loadProductionEnvironment } from './production-env.mjs';

const PRODUCTION_PROJECT_ID = 'babyready-8bfd6';

function usage() {
  return `
Usage:
  npm run clinician-admin -- --email clinician@example.com
  npm run clinician-admin -- --email clinician@example.com --apply --confirm-email clinician@example.com
  npm run clinician-admin -- --email clinician@example.com --apply --revoke --confirm-email clinician@example.com

Modes:
  Default               Read-only verification. No Firebase data is changed.
  --apply               Grants admin: true after all safeguards pass.
  --apply --revoke      Removes only the admin claim after all safeguards pass.

Required production safeguards:
  - FIREBASE_PROJECT_ID must be ${PRODUCTION_PROJECT_ID}.
  - The Local Emulator Suite must be disabled.
  - Application Default Credentials must be available to this server-only process.
  - A write requires --apply and an exact, repeated --confirm-email value.

Credentials:
  Supply Application Default Credentials outside this repository, for example
  through GOOGLE_APPLICATION_CREDENTIALS in a protected operator environment.
  Never put service-account JSON or other Admin SDK credentials in .env,
  Expo configuration, source control, or a client build.
`.trim();
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function readOption(args, option) {
  const index = args.indexOf(option);

  if (index === -1) {
    return null;
  }

  const value = args[index + 1];

  if (!value || value.startsWith('--')) {
    fail(`${option} requires a value.`);
  }

  return value;
}

function normalizeEmail(value, label) {
  const normalized = value.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    fail(`${label} must be a valid email address.`);
  }

  return normalized;
}

function parseArguments(args) {
  const supported = new Set([
    '--email',
    '--apply',
    '--revoke',
    '--confirm-email',
    '--help',
    '-h',
  ]);

  for (const argument of args) {
    if (argument.startsWith('--') && !supported.has(argument)) {
      fail(`Unsupported option: ${argument}`);
    }
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    process.exit(0);
  }

  const rawEmail = readOption(args, '--email');

  if (!rawEmail) {
    fail(`--email is required.\n\n${usage()}`);
  }

  const email = normalizeEmail(rawEmail, '--email');
  const apply = args.includes('--apply');
  const revoke = args.includes('--revoke');
  const rawConfirmation = readOption(args, '--confirm-email');

  if (revoke && !apply) {
    fail('--revoke requires --apply.');
  }

  if (apply && !rawConfirmation) {
    fail('--apply requires --confirm-email with the same email address.');
  }

  if (!apply && rawConfirmation) {
    fail('--confirm-email is only allowed with --apply.');
  }

  if (rawConfirmation && normalizeEmail(rawConfirmation, '--confirm-email') !== email) {
    fail('--confirm-email must exactly match --email.');
  }

  return { apply, email, revoke };
}

function assertProductionEnvironment() {
  loadProductionEnvironment();

  if (process.env.FIREBASE_PROJECT_ID?.trim() !== PRODUCTION_PROJECT_ID) {
    fail(
      `FIREBASE_PROJECT_ID must be ${PRODUCTION_PROJECT_ID}; refusing to manage clinician access for another project.`,
    );
  }

  if (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS?.trim().toLowerCase() === 'true') {
    fail('EXPO_PUBLIC_USE_FIREBASE_EMULATORS must be false for this production-only tool.');
  }
}

function customClaimKeys(customClaims) {
  return Object.keys(customClaims ?? {}).sort();
}

async function main() {
  const { apply, email, revoke } = parseArguments(process.argv.slice(2));
  assertProductionEnvironment();

  const app =
    getApps()[0] ??
    initializeApp({
      credential: applicationDefault(),
      projectId: PRODUCTION_PROJECT_ID,
    });
  const auth = getAuth(app);

  let user;

  try {
    user = await auth.getUserByEmail(email);
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'auth/user-not-found') {
      fail(
        `No Firebase Authentication user exists for ${email}. Create and validate the clinician's sign-in path before granting administrator access.`,
      );
    }

    throw error;
  }

  const userEmail = user.email?.trim().toLowerCase();

  if (userEmail !== email) {
    fail(
      `Firebase returned a user whose email does not exactly match the requested email. Refusing to continue.`,
    );
  }

  const existingClaims = user.customClaims ?? {};
  const hasAdminClaim = existingClaims.admin === true;
  const action = revoke ? 'revoke the administrator claim' : 'grant the administrator claim';

  console.log(`Project: ${PRODUCTION_PROJECT_ID}`);
  console.log(`Firebase user: ${user.uid}`);
  console.log(`Email: ${userEmail}`);
  console.log(`Current admin claim: ${hasAdminClaim}`);
  console.log(
    `Existing custom-claim keys: ${
      customClaimKeys(existingClaims).join(', ') || '(none)'
    }`,
  );

  if (!apply) {
    console.log('\nRead-only verification complete. No Firebase data was changed.');
    console.log(
      `To ${action}, rerun with --apply --confirm-email ${email}.`,
    );
    return;
  }

  if (revoke) {
    const { admin: _admin, ...remainingClaims } = existingClaims;
    await auth.setCustomUserClaims(user.uid, remainingClaims);
  } else {
    await auth.setCustomUserClaims(user.uid, {
      ...existingClaims,
      admin: true,
    });
  }

  const updatedUser = await auth.getUser(user.uid);
  const updatedAdminClaim = updatedUser.customClaims?.admin === true;
  const expectedAdminClaim = !revoke;

  if (updatedAdminClaim !== expectedAdminClaim) {
    fail('Firebase did not return the expected administrator-claim state after the update.');
  }

  console.log(
    `\nSuccess: administrator claim ${revoke ? 'removed from' : 'granted to'} ${userEmail}.`,
  );
  console.log(
    'Next: have the clinician sign out and sign back in, or force-refresh the ID token, then verify administrator-only access in the BabyReady clinician workspace.',
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  fail(message);
});
