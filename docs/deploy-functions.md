# Deploying the functions from GitHub

The **Deploy functions** workflow (`.github/workflows/deploy-functions.yml`) deploys everything under `functions/` on `main` to production (`babyready-8bfd6`). It runs only when you start it, and only if you type `DEPLOY`.

## Deploy

1. In the GitHub app or on github.com, open **brkurtz312/BabyReady**.
2. Tap **Actions**, then **Deploy functions**.
3. Tap **Run workflow**, keep the branch on **main**, type `DEPLOY`, and tap **Run workflow**.
4. Wait for the green check, about 3 to 5 minutes. If it fails with **409** or "unable to queue the operation", that's a temporary Google error: run it again after a minute.

## One-time setup

The workflow signs in to Google Cloud with a service account key stored as a GitHub secret. Never paste the key into chat or a file in the repo.

### 1. Create the service account

1. Open [console.cloud.google.com/iam-admin/serviceaccounts?project=babyready-8bfd6](https://console.cloud.google.com/iam-admin/serviceaccounts?project=babyready-8bfd6). Check the project picker at the top says **babyready-8bfd6**.
2. **Create service account**. Name: `github-deploy-functions`. **Create and continue**.
3. Add these roles, then **Done**:
   - Cloud Functions Admin
   - Service Account User
   - Cloud Run Admin
   - Cloud Build Editor
   - Artifact Registry Administrator
   - Cloud Scheduler Admin (for the inactive-account cleanup)
   - Secret Manager Admin (lets the deploy give Ask access to its API key; the key itself stays in Secret Manager)
   - Firebase Admin

### 2. Make a key and store it in GitHub

1. Open the new service account, **Keys**, **Add key**, **Create new key**, **JSON**, **Create**. A file downloads.
2. On github.com: **brkurtz312/BabyReady**, **Settings**, **Secrets and variables**, **Actions**, **New repository secret**.
3. Name: `FIREBASE_DEPLOY_KEY`. Value: open the downloaded file and paste its entire contents. **Add secret**.
4. Delete the downloaded file.

### If a deploy fails with a permission error

The log names the missing permission, for example `cloudscheduler.jobs.update`. Add the matching role to `github-deploy-functions` under **IAM** and run the workflow again.

### If the key is ever exposed

Delete it under the service account's **Keys**, make a new one, and replace the GitHub secret.
