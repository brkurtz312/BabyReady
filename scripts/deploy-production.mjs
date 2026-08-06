import { spawnSync } from 'node:child_process';
import { loadProductionEnvironment } from './production-env.mjs';

loadProductionEnvironment();

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
    stdio: 'inherit',
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
run('npx', ['expo', 'export', '--platform', 'web']);
run('npx', [
  'firebase',
  'deploy',
  '--only',
  'hosting,firestore',
  '--project',
  process.env.FIREBASE_PROJECT_ID.trim(),
]);
