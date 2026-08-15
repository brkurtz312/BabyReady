Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectId = 'babyready-8bfd6'
$RepoOwner = 'brkurtz312'
$RepoName = 'BabyReady'
$Repo = "$RepoOwner/$RepoName"
$ExpectedCommit = '8442479'

$PoolId = 'babyready-github'
$ProviderId = 'babyready-repository'
$DeployerAccountId = 'babyready-github-deployer'
$WorkerAccountId = 'babyready-media-intake-worker'

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  & $Command @Arguments

  if ($LASTEXITCODE -ne 0) {
    throw "STOP: Command failed: $Command $($Arguments -join ' ')"
  }
}

function Invoke-CheckedText {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  $Output = & $Command @Arguments

  if ($LASTEXITCODE -ne 0) {
    throw "STOP: Command failed: $Command $($Arguments -join ' ')"
  }

  return (($Output -join "`n").Trim())
}

function Test-GcloudResource {
  param(
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  & gcloud @Arguments 1>$null 2>$null
  return ($LASTEXITCODE -eq 0)
}

Write-Host ''
Write-Host 'BabyReady Media Intake GitHub Actions bootstrap' -ForegroundColor Cyan
Write-Host 'This creates Google Cloud identities, IAM bindings, and GitHub OIDC trust.' -ForegroundColor Yellow
Write-Host 'It does not deploy the worker, Firestore rules, or an app build.' -ForegroundColor Yellow
Write-Host ''

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw @'
STOP: Google Cloud CLI and winget are not available.
Install Google Cloud CLI from:
https://docs.cloud.google.com/sdk/docs/install-sdk

Then open a new PowerShell window and rerun this script.
'@
  }

  Write-Host 'Google Cloud CLI is not installed. Installing it now...' -ForegroundColor Yellow
  & winget install --exact --id Google.CloudSDK --source winget

  if ($LASTEXITCODE -ne 0) {
    throw 'STOP: Google Cloud CLI installation failed. No Google Cloud resources were changed.'
  }

  throw @'
STOP: Google Cloud CLI was installed. Close this PowerShell window,
open a new PowerShell window, return to BabyReady, and run this script again.
No Google Cloud resources were changed.
'@
}

if (-not (Test-Path '.git')) {
  throw 'STOP: Run this script from the root of the BabyReady Git repository. No Google Cloud resources were changed.'
}

$GitStatus = (& git status --porcelain)

if ($LASTEXITCODE -ne 0) {
  throw 'STOP: Could not read Git status. No Google Cloud resources were changed.'
}

if ($GitStatus) {
  Write-Host 'Current local changes:' -ForegroundColor Yellow
  $GitStatus
  throw 'STOP: Commit or stash local changes before the bootstrap. No Google Cloud resources were changed.'
}

Invoke-Checked git @('fetch', 'origin', 'main')
Invoke-Checked git @('switch', 'main')
Invoke-Checked git @('pull', '--ff-only', 'origin', 'main')
Invoke-Checked git @('merge-base', '--is-ancestor', $ExpectedCommit, 'HEAD')

Write-Host "Verified repository contains deployment workflow commit $ExpectedCommit." -ForegroundColor Green

$ActiveAccount = Invoke-CheckedText gcloud @(
  'auth', 'list',
  '--filter=status:ACTIVE',
  '--format=value(account)'
)

if (-not $ActiveAccount) {
  Write-Host 'No active Google Cloud account found. Opening Google sign-in...' -ForegroundColor Yellow
  Invoke-Checked gcloud @('auth', 'login')

  $ActiveAccount = Invoke-CheckedText gcloud @(
    'auth', 'list',
    '--filter=status:ACTIVE',
    '--format=value(account)'
  )
}

if (-not $ActiveAccount) {
  throw 'STOP: Google Cloud sign-in did not produce an active account. No Google Cloud resources were changed.'
}

Invoke-Checked gcloud @('config', 'set', 'project', $ProjectId)

$ConfiguredProject = Invoke-CheckedText gcloud @('config', 'get-value', 'project')

if ($ConfiguredProject -ne $ProjectId) {
  throw "STOP: gcloud is configured for '$ConfiguredProject', not '$ProjectId'. No Google Cloud resources were changed."
}

$ProjectNumber = Invoke-CheckedText gcloud @(
  'projects', 'describe', $ProjectId,
  '--format=value(projectNumber)'
)

if (-not $ProjectNumber -or $ProjectNumber -notmatch '^\d+$') {
  throw 'STOP: Could not determine the numeric Google Cloud project number. No Google Cloud resources were changed.'
}

$DeployerEmail = "$DeployerAccountId@$ProjectId.iam.gserviceaccount.com"
$WorkerEmail = "$WorkerAccountId@$ProjectId.iam.gserviceaccount.com"
$WorkloadIdentityProvider = (
  "projects/$ProjectNumber/locations/global/" +
  "workloadIdentityPools/$PoolId/providers/$ProviderId"
)
$PoolResource = "projects/$ProjectNumber/locations/global/workloadIdentityPools/$PoolId"

Write-Host ''
Write-Host "Google Cloud project: $ProjectId" -ForegroundColor Cyan
Write-Host "Active Google account: $ActiveAccount" -ForegroundColor Cyan
Write-Host "GitHub repository: $Repo" -ForegroundColor Cyan
Write-Host ''
Write-Host 'This will now:' -ForegroundColor Yellow
Write-Host '  1. Enable the required Google Cloud APIs.'
Write-Host '  2. Create the GitHub deployer and Media Intake runtime service accounts if needed.'
Write-Host '  3. Create a workload identity pool restricted to brkurtz312/BabyReady main.'
Write-Host '  4. Grant the deployer only the roles needed for Cloud Run and Firestore-rules deployment.'
Write-Host '  5. Grant the runtime service account only Firestore and Vertex AI access.'
Write-Host ''

$Confirmation = Read-Host 'Type BOOTSTRAP_MEDIA_INTAKE_GITHUB to continue'

if ($Confirmation -cne 'BOOTSTRAP_MEDIA_INTAKE_GITHUB') {
  throw 'STOP: Confirmation did not match. No Google Cloud resources were changed.'
}

Write-Host ''
Write-Host 'Enabling required Google Cloud APIs...' -ForegroundColor Cyan

Invoke-Checked gcloud @(
  'services', 'enable',
  'iam.googleapis.com',
  'iamcredentials.googleapis.com',
  'sts.googleapis.com',
  'run.googleapis.com',
  'cloudbuild.googleapis.com',
  'artifactregistry.googleapis.com',
  'aiplatform.googleapis.com',
  'firestore.googleapis.com',
  'firebaserules.googleapis.com',
  '--project', $ProjectId
)

Write-Host ''
Write-Host 'Ensuring service accounts exist...' -ForegroundColor Cyan

if (-not (Test-GcloudResource @(
  'iam', 'service-accounts', 'describe', $DeployerEmail,
  '--project', $ProjectId
))) {
  Invoke-Checked gcloud @(
    'iam', 'service-accounts', 'create', $DeployerAccountId,
    '--project', $ProjectId,
    '--display-name', 'BabyReady GitHub Actions deployer',
    '--description', 'Keyless GitHub Actions identity for guarded Media Intake deployments.'
  )
}

if (-not (Test-GcloudResource @(
  'iam', 'service-accounts', 'describe', $WorkerEmail,
  '--project', $ProjectId
))) {
  Invoke-Checked gcloud @(
    'iam', 'service-accounts', 'create', $WorkerAccountId,
    '--project', $ProjectId,
    '--display-name', 'BabyReady Media Intake worker',
    '--description', 'Runtime identity for clinician-only URL and video evaluation.'
  )
}

Write-Host ''
Write-Host 'Ensuring GitHub OIDC workload identity pool exists...' -ForegroundColor Cyan

if (-not (Test-GcloudResource @(
  'iam', 'workload-identity-pools', 'describe', $PoolId,
  '--project', $ProjectId,
  '--location', 'global'
))) {
  Invoke-Checked gcloud @(
    'iam', 'workload-identity-pools', 'create', $PoolId,
    '--project', $ProjectId,
    '--location', 'global',
    '--display-name', 'BabyReady GitHub Actions',
    '--description', 'Keyless GitHub Actions identities for BabyReady.'
  )
}

Write-Host ''
Write-Host 'Ensuring GitHub OIDC provider exists...' -ForegroundColor Cyan

if (-not (Test-GcloudResource @(
  'iam', 'workload-identity-pools', 'providers', 'describe', $ProviderId,
  '--project', $ProjectId,
  '--location', 'global',
  '--workload-identity-pool', $PoolId
))) {
  Invoke-Checked gcloud @(
    'iam', 'workload-identity-pools', 'providers', 'create-oidc', $ProviderId,
    '--project', $ProjectId,
    '--location', 'global',
    '--workload-identity-pool', $PoolId,
    '--display-name', 'BabyReady GitHub repository',
    '--issuer-uri', 'https://token.actions.githubusercontent.com',
    '--attribute-mapping', 'google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref',
    '--attribute-condition', "assertion.repository=='$Repo' && assertion.ref=='refs/heads/main'"
  )
}

Write-Host ''
Write-Host 'Granting GitHub OIDC impersonation access...' -ForegroundColor Cyan

Invoke-Checked gcloud @(
  'iam', 'service-accounts', 'add-iam-policy-binding', $DeployerEmail,
  '--project', $ProjectId,
  '--role', 'roles/iam.workloadIdentityUser',
  '--member', "principalSet://iam.googleapis.com/$PoolResource/attribute.repository/$Repo",
  '--quiet'
)

Write-Host ''
Write-Host 'Granting deployer permissions...' -ForegroundColor Cyan

foreach ($Role in @(
  'roles/run.admin',
  'roles/cloudbuild.builds.editor',
  'roles/artifactregistry.writer',
  'roles/firebase.rulesAdmin'
)) {
  Invoke-Checked gcloud @(
    'projects', 'add-iam-policy-binding', $ProjectId,
    '--member', "serviceAccount:$DeployerEmail",
    '--role', $Role,
    '--quiet'
  )
}

Invoke-Checked gcloud @(
  'iam', 'service-accounts', 'add-iam-policy-binding', $WorkerEmail,
  '--project', $ProjectId,
  '--member', "serviceAccount:$DeployerEmail",
  '--role', 'roles/iam.serviceAccountUser',
  '--quiet'
)

Write-Host ''
Write-Host 'Granting worker runtime permissions...' -ForegroundColor Cyan

foreach ($Role in @(
  'roles/datastore.user',
  'roles/aiplatform.user'
)) {
  Invoke-Checked gcloud @(
    'projects', 'add-iam-policy-binding', $ProjectId,
    '--member', "serviceAccount:$WorkerEmail",
    '--role', $Role,
    '--quiet'
  )
}

Write-Host ''
Write-Host 'SUCCESS: Google Cloud bootstrap is complete.' -ForegroundColor Green
Write-Host ''
Write-Host 'Create these GitHub Actions repository variables exactly:' -ForegroundColor Yellow
Write-Host ''
Write-Host 'Name:  GCP_DEPLOY_SERVICE_ACCOUNT'
Write-Host "Value: $DeployerEmail"
Write-Host ''
Write-Host 'Name:  GCP_WORKLOAD_IDENTITY_PROVIDER'
Write-Host "Value: $WorkloadIdentityProvider"
Write-Host ''
Write-Host 'No service-account key, Firebase token, or Vertex AI key is needed in GitHub or EAS.'
Write-Host 'Next: create the protected GitHub environment named production, add the two variables, then run Deploy Media Intake manually.'
