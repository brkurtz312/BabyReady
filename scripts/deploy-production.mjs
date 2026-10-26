import { spawnSync } from 'node:child_process';
import { cpSync, renameSync } from 'node:fs';
import { loadProductionEnvironment } from './production-env.mjs';

loadProductionEnvironment();

// On the web nothing can be bought, so the paid lessons stay locked and point to
// the app; the free lessons stay open. Set here so a PC's .env can't turn it off.
process.env.EXPO_PUBLIC_ENABLE_PAYWALL = 'true';

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
    stdio: 'inherit',
    // On Windows, npx is npx.cmd, which Node only launches through the shell.
    // Only npx: node's own path (C:\Program Files\...) would break in the shell.
    shell: process.platform === 'win32' && command === 'npx',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(process.execPath, ['scripts/check-production-env.mjs']);
// --clear: Expo's build cache can keep EXPO_PUBLIC_ values from an earlier
// local build, such as a test build with the purchase switched on.
run('npx', ['expo', 'export', '--platform', 'web', '--clear']);
// The landing page (web/landing) is the home page; the class moves to /class.
renameSync('dist/index.html', 'dist/class.html');
cpSync('web/landing', 'dist', { recursive: true });
run('npx', [
  'firebase',
  'deploy',
  '--only',
  'hosting,firestore',
  '--project',
  process.env.FIREBASE_PROJECT_ID.trim(),
]);
