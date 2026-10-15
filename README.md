# BabyReady

BabyReady is a virtual childbirth class built with Expo and Firebase. Each lesson plays like attending a class: narrated slides with captions, short videos, check-in questions, a review quiz, and reflection questions that save to the learner's private Birth Readiness Brief.

The previous clinician governance workflow (review queues, audit PDFs, QR verification, media intake, and content-authoring scripts) is preserved on the `archive/governance-workspace` branch. See [docs/handoff/HANDOFF.md](docs/handoff/HANDOFF.md) for the decisions behind the change.

## Safety and product boundary

BabyReady is an education and preparation product. It does not diagnose, provide individualized labor triage, direct medication use, interpret fetal or newborn data, or replace obstetric, midwifery, pediatric, lactation, or emergency care.

Safety slides are never AI-generated and cannot be skipped until their narration finishes. Any future "Ask a question" feature must run deterministic urgent-safety routing before any AI call, and keep AI provider keys server-side.

## Lessons and the quality model

Lessons are JSON files in `content/lessons/<course>/`, using the format in `src/models/lesson.ts`. Git history is the audit trail.

1. Every teaching slide cites at least one source. No source, no slide.
2. Sources come only from approved organizations: ACOG, AAP, CDC, NICHD, AAFP, ACNM, WHO, Lamaze, ICEA.
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

### Firestore rules

`firestore.rules` keeps each learner's progress, Birth Readiness Brief, and class reflection answers inside `users/{uid}`, readable and writable only by that learner. Reflection answers live at `users/{uid}/birthReadinessReflections/{lessonId}__{slideId}`, with bounded text and server timestamps. `tests/firestore.rules.test.mjs` covers these rules, and CI runs it on each pull request.

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
