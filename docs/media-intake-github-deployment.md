# Media Intake production deployment

The Media Intake worker and Firestore rules are deployed from the **Deploy Media Intake** GitHub Actions workflow. It is intentionally manual. Every run verifies the selected revision before it can deploy, and production changes require the exact confirmation text `DEPLOY_MEDIA_INTAKE`.

## Why GitHub Actions

The deployment runs on a hosted Linux runner with Node 20 and Java 21. This avoids relying on a Cloud Shell session or a developer machine having Java, Firebase CLI authentication, and a working local Google Cloud installation.

Authentication uses Google Cloud Workload Identity Federation (WIF). GitHub receives a short-lived credential at run time; no Google service-account JSON key is stored in the repository.

## One-time Google Cloud bootstrap

An owner of Google Cloud project `babyready-8bfd6` performs these actions once, from a terminal with the Google Cloud CLI installed and authenticated:

1. Enable the IAM Credentials API:

   ```powershell
   gcloud services enable iamcredentials.googleapis.com --project babyready-8bfd6
   ```

2. Create a dedicated deployer identity:

   ```powershell
   gcloud iam service-accounts create babyready-github-deployer `
     --project babyready-8bfd6 `
     --display-name "BabyReady GitHub Actions deployer"
   ```

3. Create the Media Intake runtime identity, if it is not already present:

   ```powershell
   gcloud iam service-accounts create babyready-media-intake-worker `
     --project babyready-8bfd6 `
     --display-name "BabyReady Media Intake worker"
   ```

4. Create a GitHub Actions workload identity pool and provider that accepts tokens only from `brkurtz312/BabyReady`:

   ```powershell
   $ProjectId = 'babyready-8bfd6'
   $ProjectNumber = (gcloud projects describe $ProjectId --format='value(projectNumber)').Trim()

   gcloud iam workload-identity-pools create babyready-github `
     --project $ProjectId `
     --location global `
     --display-name "BabyReady GitHub Actions"

   gcloud iam workload-identity-pools providers create-oidc babyready-repository `
     --project $ProjectId `
     --location global `
     --workload-identity-pool babyready-github `
     --display-name "BabyReady GitHub repository" `
     --issuer-uri "https://token.actions.githubusercontent.com" `
     --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" `
     --attribute-condition "assertion.repository=='brkurtz312/BabyReady' && assertion.ref=='refs/heads/main'"
   ```

5. Permit only this repository's `main` branch to impersonate the deployer:

   ```powershell
   $ProjectId = 'babyready-8bfd6'
   $ProjectNumber = (gcloud projects describe $ProjectId --format='value(projectNumber)').Trim()
   $PoolResource = "projects/$ProjectNumber/locations/global/workloadIdentityPools/babyready-github"
   $Deployer = "babyready-github-deployer@$ProjectId.iam.gserviceaccount.com"

   gcloud iam service-accounts add-iam-policy-binding $Deployer `
     --project $ProjectId `
     --role roles/iam.workloadIdentityUser `
     --member "principalSet://iam.googleapis.com/$PoolResource/attribute.repository/brkurtz312/BabyReady"
   ```

6. Assign least-privilege roles deliberately:

   ```powershell
   $ProjectId = 'babyready-8bfd6'
   $Deployer = "babyready-github-deployer@$ProjectId.iam.gserviceaccount.com"
   $Worker = "babyready-media-intake-worker@$ProjectId.iam.gserviceaccount.com"

   # Deployment identity: deploy a Cloud Run revision, build its image, deploy rules, and use the worker identity.
   foreach ($Role in @(
     'roles/run.admin',
     'roles/cloudbuild.builds.editor',
     'roles/artifactregistry.writer',
     'roles/firebase.rulesAdmin'
   )) {
     gcloud projects add-iam-policy-binding $ProjectId `
       --member "serviceAccount:$Deployer" `
       --role $Role `
       --condition None `
       --quiet
   }

   # The deployer may use only the Media Intake runtime identity.
   gcloud iam service-accounts add-iam-policy-binding $Worker `
     --project $ProjectId `
     --member "serviceAccount:$Deployer" `
     --role roles/iam.serviceAccountUser

   # Runtime identity: evaluate intake candidates only.
   foreach ($Role in @(
     'roles/datastore.user',
     'roles/aiplatform.user'
   )) {
     gcloud projects add-iam-policy-binding $ProjectId `
       --member "serviceAccount:$Worker" `
       --role $Role `
       --condition None `
       --quiet
   }
   ```

7. In GitHub repository settings, create these **Actions variables**:

   | Variable | Value |
   | --- | --- |
   | `GCP_DEPLOY_SERVICE_ACCOUNT` | `babyready-github-deployer@babyready-8bfd6.iam.gserviceaccount.com` |
   | `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/babyready-github/providers/babyready-repository` |

Replace `PROJECT_NUMBER` with the numeric value returned in step 4.

8. In GitHub repository settings, create a protected **production environment** and require your review before deployment. The workflow uses that environment, so GitHub pauses after validation and before the first production mutation.

## Deploy a revision

1. Confirm `main` includes the desired commit and that the **Verify BabyReady** workflow is green.
2. Open **Actions** in GitHub, select **Deploy Media Intake**, and choose **Run workflow**.
3. Enter `main` or the exact commit SHA in **git_ref**.
4. Type `DEPLOY_MEDIA_INTAKE` exactly.
5. Review the `production` environment approval prompt. Approval starts the deployment.
6. Copy the Worker URL from the workflow summary into EAS as `EXPO_PUBLIC_MEDIA_INTAKE_WORKER_URL` for the production environment.
7. Create a new EAS production build. Do not put Firebase Admin, service-account, or Vertex AI credentials into EAS.

## Recovery and safety

- A failed validation job makes no production changes.
- A missing WIF variable or invalid identity stops before worker/rules deployment.
- The worker health check must succeed before Firestore rules are deployed.
- The workflow is serialized with other Media Intake production deployments.
- Re-running the workflow with the same revision is safe for Cloud Run and Firestore rules, but every run should still be intentionally approved.
