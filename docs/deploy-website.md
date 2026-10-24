# Deploying the website from GitHub

The **Deploy website** workflow (`.github/workflows/deploy-website.yml`) builds the web app from `main` and deploys it to production (`babyready-8bfd6`), with the Firestore rules and indexes. It is the same as running `npm run deploy:production` on a PC. It runs only when you start it, and only if you type `DEPLOY`.

## Deploy

1. In the GitHub app or on github.com, open **brkurtz312/BabyReady**.
2. Tap **Actions**, then **Deploy website**.
3. Tap **Run workflow**, keep the branch on **main**, type `DEPLOY`, and tap **Run workflow**.
4. Wait for the green check, about 5 minutes.

## One-time setup

It signs in with the same `FIREBASE_DEPLOY_KEY` secret as **Deploy functions** (see `docs/deploy-functions.md`). It also needs the Firebase web settings, which are public values that ship inside the app, saved as GitHub **variables** (not secrets):

1. On github.com: **brkurtz312/BabyReady**, **Settings**, **Secrets and variables**, **Actions**, then the **Variables** tab.
2. Add each of these with **New repository variable**. Copy each value from the `.env` file in your BabyReady folder (open it in Notepad):
   - `EXPO_PUBLIC_FIREBASE_API_KEY`
   - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `EXPO_PUBLIC_FIREBASE_APP_ID`

The project ID is already in the workflow. If one is missing, the run stops at "Build and deploy" and names it.

### If a deploy fails with a permission error

The log names the missing permission. Add the matching role (for example Firebase Hosting Admin, or Firebase Rules Admin) to the `github-deploy-functions` service account under **IAM** and run the workflow again.
