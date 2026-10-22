# BabyReady

BabyReady is a virtual childbirth class built with Expo and Firebase. Each lesson plays like attending a class: narrated slides with captions, short videos, check-in questions, a review quiz, and reflection questions that save to the learner's private Birth Readiness Brief.

The previous clinician governance workflow (review queues, audit PDFs, QR verification, media intake, and content-authoring scripts) is preserved on the `archive/governance-workspace` branch. See [docs/handoff/HANDOFF.md](docs/handoff/HANDOFF.md) for the decisions behind the change.

## Safety and product boundary

BabyReady is an education and preparation product. It does not diagnose, provide individualized labor triage, direct medication use, interpret fetal or newborn data, or replace obstetric, midwifery, pediatric, lactation, or emergency care.

Safety slides are never AI-generated and cannot be skipped until their narration finishes. Any future "Ask a question" feature must run deterministic urgent-safety routing before any AI call, and keep AI provider keys server-side.

## Lessons and the quality model

Lessons are JSON files in `content/lessons/<course>/`, using the format in `src/models/lesson.ts`. Git history is the audit trail.

1. Every teaching slide cites at least one source. No source, no slide.
2. Sources come only from approved organizations: ACOG, AAP, CDC, NICHD, AAFP, ACNM, WHO, Lamaze, ICEA, and, for CPR and choking, the AHA and the American Red Cross.
3. A lesson is `draft` or `reviewed`. Reviewed lessons record the reviewer and credentials, the review date, and a re-check date no more than 12 months later, and every source must have a `verifiedOn` date.

`npm run test:lessons` checks every lesson against these rules, and CI runs it on each pull request.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

3. Create or select a Firebase project, then add its **public web app configuration** to `.env`.

4. In Firebase Authentication, enable **Anonymous** access.

5. Start Expo:

   ```bash
   npm start
   ```

6. Run the checks:

   ```bash
   npm run typecheck
   ```

   ```bash
   npm run test:lessons
   ```

   ```bash
   npm run test:emulators
   ```

## Firebase setup

The app does not initialize Firebase until all `EXPO_PUBLIC_FIREBASE_*` values are available, so it can run without a Firebase project. Without Firebase, reflection answers are kept on the device only.

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

These are public Firebase app configuration values. Never add Admin SDK service-account JSON, AI-provider keys, or other server-only credentials to the Expo client.

### Local Emulator Suite

Set these development-only values to connect the app to local Auth and Firestore emulators:

```bash
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1
EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT=9099
EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT=8080
```

Use a reachable LAN IP instead of `127.0.0.1` for a physical device. `npm run test:emulators` starts isolated emulators automatically (it needs Java).

### Full-class purchase

Early Pregnancy Basics, the class welcome, and every lesson on when to get urgent help are free. The rest of the class is one non-consumable purchase through RevenueCat (`src/services/purchaseService.ts`, `src/components/PaywallSheet.tsx`). The free list is `src/lib/access.ts`, tested in `tests/access.test.mjs`. It's off unless this is set:

```bash
EXPO_PUBLIC_ENABLE_PAYWALL=true
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
```

The app buys the default offering's first package attached to the `full_class` entitlement and never names the product, so the product and price are changed in App Store Connect and RevenueCat, not in code. The price shown is always the store's own `priceString`; never write an amount into the app. The web build can't buy: it shows the free lessons and points to the app for the rest.

### What instructor answers cost

Each answer from `askLessonQuestion` writes one `ask_usage` line to Cloud Logging: the lesson, the model, the token counts, and the cost in dollars (`functions/src/askCost.ts`, tested in `tests/askCost.test.mjs`). It never includes the question, the answer, or the account. To see the totals:

```bash
node scripts/ask-cost-report.mjs --days 30
```

It needs the `gcloud` CLI signed in to the Firebase project. Update the prices in `functions/src/askCost.ts` if the model or Anthropic's prices change.

### Public pages

`public/` holds static pages that Expo's web export copies into `dist`; with `cleanUrls`, Hosting serves them ahead of the app:

- `/delete-account`: how to delete BabyReady data, for Google Play's account deletion link.

The privacy policy lives on the company site, at https://brk-services.com/privacy-policy-babyready.html (the `brkurtz312/BRK-Services` repo), with BRK Services LLC's other app policies. The home screen's "Your data" card links to it, and `/privacy` on Hosting redirects there (`firebase.json`).

### Firestore rules

`firestore.rules` keeps each learner's progress, Birth Readiness Brief, and class reflection answers inside `users/{uid}`, readable and writable only by that learner. Reflection answers live at `users/{uid}/birthReadinessReflections/{lessonId}__{slideId}`, with bounded text and server timestamps. Lesson progress (finished lessons and the last lesson opened, for the home screen's lesson list and Continue card) lives at `users/{uid}/courseProgress/class`, with a copy kept on the device. `tests/firestore.rules.test.mjs` covers these rules, and CI runs it on each pull request.

### Deleting a learner's data

The home screen's **Delete my data** button (`src/components/DeleteDataSheet.tsx`) calls the `deleteMyAccount` Cloud Function, which deletes everything under `users/{uid}` and the learner's sign-in. If that succeeds, the app clears the device copies of progress and reflection answers and signs out, which starts a new, empty anonymous session. If the server step fails, nothing on the device is touched, so the learner can try again. Without Firebase, the button clears the device copies only. Deploy the function (`firebase deploy --only functions`) before turning on Firebase in production.

Accounts nobody opens for 12 months are deleted the same way by `deleteInactiveAccounts`, which runs at 3:15am Pacific on the 1st of each month. The 12 months are counted from the account's latest sign-in or session refresh, which happens whenever the app is opened (`functions/src/retention.ts`, tested in `tests/retention.test.mjs`). Scheduled functions need the Cloud Scheduler API, which `firebase deploy` offers to enable on first deploy. A copy on a phone that hasn't opened the app stays there until the app is opened again or deleted.

The rules still include the collections used by the archived governance workflow, so existing published course content stays readable.

## Production deployment

Copy `.env.production.example` to `.env`, fill in the production project's public values, then run from an authenticated Firebase CLI session:

```bash
npm run deploy:production
```

The script checks the environment, exports the static Expo web app to `dist`, and deploys Firebase Hosting plus Firestore rules and indexes to the project named by `FIREBASE_PROJECT_ID`. The production alias is `babyready-8bfd6`.

## Project layout

```text
.
├── App.tsx                          # Home screen and navigation
├── content/lessons/labor-basics/    # Module 2 lesson JSON files
├── docs/handoff/                    # Product decisions and class player prototype
├── src/
│   ├── auth/AuthProvider.tsx        # Firebase auth session
│   ├── components/                  # Shared UI, including Brief reflections
│   ├── content/lessons.ts           # Loads and checks lesson files
│   ├── lib/lessonRules.ts           # Lesson quality rules
│   ├── lib/narration.ts             # Placeholder device narration
│   ├── models/lesson.ts             # Lesson format
│   ├── screens/ClassPlayerScreen.tsx
│   ├── screens/BirthReadinessBriefScreen.tsx
│   └── services/                    # Firebase reads and writes
├── tests/lessons.test.mjs           # Lesson rule checks
├── tests/firestore.rules.test.mjs   # Security rule checks
└── firestore.rules
```

## References

- [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/)
- [Firebase Firestore Security Rules documentation](https://firebase.google.com/docs/firestore/security/get-started)
