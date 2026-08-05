# BabyReady

BabyReady is a private Expo and Firebase foundation for a clinically governed virtual childbirth-education and preparation app. It is designed around the BirthReady MVP backlog: six short course modules, preparation plans, restricted support-person access, source-grounded AI education, and deterministic maternal/newborn urgent-safety routing.

## What this scaffold includes

- **Expo + TypeScript app shell** with a mobile-first six-module birth-preparation roadmap.
- **Firebase boundary** that initializes only when public client configuration is present.
- **Typed domain model** for course modules, progress, clinical content blocks, sources, and care-team contacts.
- **Demo course data** matching the six-module MVP.
- **Secure local contact store** using `expo-secure-store` for care-team contact scaffolding. Secure local storage is a convenience cache, not the system of record for irreplaceable information.
- **Firestore rules and Firebase configuration** that separate clinician-published curriculum from user-owned progress, plans, contacts, and future support-person sharing.
- **Environment template** that keeps Firebase configuration out of source control.

## Safety and product boundary

BabyReady is an education and preparation product. It does not diagnose, provide individualized labor triage, direct medication use, interpret fetal or newborn data, or replace obstetric, midwifery, pediatric, lactation, or emergency care.

The app must keep deterministic maternal/newborn safety routing ahead of all generative AI output. Do not connect an unrestricted chatbot to user-facing clinical questions. The approved-content retrieval boundary, safety ontology, clinical review workflow, and evaluation harness are tracked in the BabyReady GitHub milestones.

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

4. Start Expo:

   ```bash
   npm start
   ```

5. Run TypeScript validation:

   ```bash
   npm run typecheck
   ```

## Firebase setup

The app intentionally does not initialize Firebase until all `EXPO_PUBLIC_FIREBASE_*` values are available. This lets the scaffold run as a static course shell before a Firebase project is connected.

### Required public client values

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

These are public Firebase app configuration values. They are not Firebase Admin SDK credentials and they do not replace Firestore Security Rules. Never add Admin SDK service-account JSON, private AI-provider keys, or server-only credentials to the Expo client.

### Firestore rules

`firestore.rules` is a Sprint 1 starting policy:

- Published course content is readable; only a trusted admin workflow can write or freeze it.
- Progress, plans, and care-team contacts remain inside `users/{uid}`.
- Safety events are server-write only.
- Support-person access is intentionally scoped and must not expose private health history, private AI chats, or unshared artifacts.

Before production, use Firebase Emulator Suite tests and deploy rules through a controlled CI/CD path. Do not use broad `allow read, write: if true` rules at any stage.

## Project layout

```text
.
├── App.tsx                         # Sprint 1 course-shell experience
├── src/
│   ├── components/ModuleCard.tsx    # Reusable roadmap module card
│   ├── config/env.ts                # Public Expo Firebase config boundary
│   ├── data/course.ts               # Six-module seed data
│   ├── lib/firebase.ts              # Guarded Firebase/Firestore initialization
│   ├── models/course.ts              # Shared domain types
│   └── services/contactStore.ts      # Secure local care-team contact cache
├── firestore.rules                  # Firestore security baseline
├── firestore.indexes.json
├── firebase.json
└── .env.example
```

## Delivery roadmap

The private GitHub repository contains the planned work under eight sprint milestones:

1. Foundations and clinical content control
2. Module delivery and progress tracking
3. Plans, contacts, exports, and Modules 3–4
4. AI lesson companion and emergency safety router
5. Support-person experience and Modules 5–6
6. Personalization, accessibility, analytics, and internal alpha
7. Closed beta readiness and controlled release
8. Beta learning, hardening, and general-availability decision

## Next implementation steps

1. Create the Firebase project and populate local `.env`.
2. Implement Firebase Authentication and attach users to `users/{uid}` data.
3. Build the clinician-reviewed content authoring/review workflow before publishing clinical curriculum.
4. Add Firebase Emulator Suite tests for `firestore.rules`.
5. Replace the demo course seed with clinically reviewed content only after content-review metadata and approval workflow are working.
6. Implement the emergency safety router before enabling any generative AI lesson companion.

## References

- [Expo SDK 57 SecureStore documentation](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/)
- [Firebase Firestore Security Rules documentation](https://firebase.google.com/docs/firestore/security/get-started)
