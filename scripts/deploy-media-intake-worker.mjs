import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EXPECTED_PROJECT_ID = 'babyready-8bfd6';
const SERVICE_NAME = 'babyready-media-intake-worker';
const REGION = 'us-central1';
const PRODUCTION_TAG = 'production';
const RUNTIME_SERVICE_ACCOUNT =
  `babyready-media-intake-worker@${EXPECTED_PROJECT_ID}.iam.gserviceaccount.com`;
const WORKER_DIRECTORY = resolve('services/media-intake-worker');

function fail(message) {
  console.error(`STOP: ${message}`);
  process.exit(1);
}

function run(command, args, { showStdout = false } = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    fail(`${command} ${args.join(' ')} failed. No further deployment steps were run.`);
  }
  const stdout = result.stdout.trim();
  if (showStdout && stdout) {
    console.log(stdout);
  }
  return stdout;
}

function commandExists(command) {
  return spawnSync(command, ['--version'], { encoding: 'utf8' }).status === 0;
}

function getHealthCheckIdentityToken(serviceUrl) {
  const suppliedToken = process.env.MEDIA_INTAKE_HEALTH_CHECK_ID_TOKEN?.trim();
  if (suppliedToken) {
    return suppliedToken;
  }

  const token = run('gcloud', [
    'auth',
    'print-identity-token',
    `--audiences=${serviceUrl}`,
  ]);
  if (!token) {
    fail('gcloud did not return an identity token for the worker health check.');
  }
  return token;
}

async function verifyHealth(serviceUrl) {
  const healthUrl = new URL('/healthz', serviceUrl);
  const identityToken = getHealthCheckIdentityToken(serviceUrl);
  let lastError = 'The health endpoint did not respond successfully.';

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(healthUrl, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${identityToken}`,
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (response.ok) {
        console.log(`Worker health check passed: ${healthUrl} (HTTP ${response.status}).`);
        return;
      }
      const bodyPreview = (await response.text()).replace(/\s+/g, ' ').slice(0, 1_000);
      const diagnosticHeaders = Object.fromEntries(
        ['content-type', 'location', 'server', 'via', 'x-cloud-trace-context']
          .map((name) => [name, response.headers.get(name)])
          .filter(([, value]) => value),
      );
      console.error(
        `Worker health diagnostic, attempt ${attempt}/5: ${JSON.stringify({
          url: healthUrl.toString(),
          status: response.status,
          statusText: response.statusText,
          headers: diagnosticHeaders,
          bodyPreview,
        })}`,
      );
      lastError = `The health endpoint returned HTTP ${response.status}${
        bodyPreview ? `: ${bodyPreview}` : '.'
      }`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`Worker health diagnostic, attempt ${attempt}/5: ${lastError}`);
    }

    if (attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
    }
  }

  fail(`Worker deployment completed but the health check failed: ${lastError}`);
}

if (!commandExists('gcloud')) {
  fail('gcloud is required. Install or open a Google Cloud terminal before retrying.');
}

if (!existsSync(resolve(WORKER_DIRECTORY, 'package.json'))) {
  fail('The Media Intake worker directory is missing.');
}

const workerPackage = JSON.parse(readFileSync(resolve(WORKER_DIRECTORY, 'package.json'), 'utf8'));
if (workerPackage.name !== 'babyready-media-intake-worker') {
  fail('The Media Intake worker package identity does not match the expected service.');
}

const configuredProject = run('gcloud', ['config', 'get-value', 'project']);
if (configuredProject !== EXPECTED_PROJECT_ID) {
  fail(
    `gcloud is configured for ${configuredProject || '(none)'}, not ${EXPECTED_PROJECT_ID}. No deployment was attempted.`,
  );
}

const activeAccount = run('gcloud', ['auth', 'list', '--filter=status:ACTIVE', '--format=value(account)']);
if (!activeAccount) {
  fail('No active Google Cloud account is available. No deployment was attempted.');
}

run('gcloud', [
  'iam',
  'service-accounts',
  'describe',
  RUNTIME_SERVICE_ACCOUNT,
  '--project',
  EXPECTED_PROJECT_ID,
  '--format=value(email)',
]);

console.log(`Project: ${EXPECTED_PROJECT_ID}`);
console.log(`Region: ${REGION}`);
console.log(`Runtime service account: ${RUNTIME_SERVICE_ACCOUNT}`);
console.log('Required before deployment:');
console.log('  1. Grant the runtime service account Firestore read/write access limited to this project.');
console.log('  2. Grant the runtime service account Vertex AI User for the selected model.');
console.log('  3. Confirm the allowed web origins and client-facing worker URL.');
console.log('');
console.log('Deploying a public HTTPS endpoint with application-level Firebase-token authorization.');

const allowedOrigins = [
  'https://babyready.app',
  `https://${EXPECTED_PROJECT_ID}.web.app`,
  `https://${EXPECTED_PROJECT_ID}.firebaseapp.com`,
].join(',');

// gcloud normally uses commas to separate KEY=VALUE pairs. The allowlist is
// itself a comma-delimited value, so choose @ as the explicit pair delimiter.
const runtimeEnvironmentVariables = [
  `FIREBASE_PROJECT_ID=${EXPECTED_PROJECT_ID}`,
  'VERTEX_AI_LOCATION=us-central1',
  `MEDIA_INTAKE_ALLOWED_ORIGINS=${allowedOrigins}`,
].join('@');

run(
  'gcloud',
  [
  'run',
  'deploy',
  SERVICE_NAME,
  '--source',
  WORKER_DIRECTORY,
  '--project',
  EXPECTED_PROJECT_ID,
  '--region',
  REGION,
  '--service-account',
  RUNTIME_SERVICE_ACCOUNT,
  '--allow-unauthenticated',
  '--ingress',
  'all',
  '--default-url',
  '--tag',
  PRODUCTION_TAG,
  '--set-env-vars',
  `^@^${runtimeEnvironmentVariables}`,
  ],
  { showStdout: true },
);

const serviceDiagnostics = run('gcloud', [
  'run',
  'services',
  'describe',
  SERVICE_NAME,
  '--project',
  EXPECTED_PROJECT_ID,
  '--region',
  REGION,
  '--format=json(status.url,status.latestCreatedRevisionName,status.latestReadyRevisionName,status.traffic,metadata.annotations,spec.template.spec.containers[0].image)',
]);

const service = JSON.parse(serviceDiagnostics);
if (!service.status?.url?.startsWith('https://')) {
  fail('Cloud Run did not return a valid HTTPS service URL.');
}

const latestReadyRevision = service.status?.latestReadyRevisionName;
const productionTraffic = service.status?.traffic?.find(
  (traffic) => traffic.tag === PRODUCTION_TAG && traffic.revisionName === latestReadyRevision,
);
if (!productionTraffic?.url?.startsWith('https://')) {
  fail(
    `Cloud Run did not attach the ${PRODUCTION_TAG} tag and an HTTPS URL to the latest ready revision. ` +
      'No application URL was reported.',
  );
}

const serviceUrl = productionTraffic.url;
console.log(`Cloud Run post-deploy diagnostics: ${serviceDiagnostics}`);

if (process.env.MEDIA_INTAKE_SKIP_HEALTH_CHECK === 'true') {
  console.log('Worker deployment completed. Health verification is delegated to the authenticated CI probe.');
} else {
  await verifyHealth(serviceUrl);
}

console.log('');
console.log(`SUCCESS: Worker deployed at ${serviceUrl}`);
console.log('Next safe step: set EXPO_PUBLIC_MEDIA_INTAKE_WORKER_URL to this exact production-tag HTTPS URL in the EAS production environment, then create a new app build. Do not put Firebase Admin or AI credentials in EAS.');
