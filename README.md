# BabyReady

BabyReady is a private Expo and Firebase foundation for a clinically governed virtual childbirth-education and preparation app. It is designed around the BirthReady MVP backlog: six short course modules, preparation plans, restricted support-person access, source-grounded AI education, and deterministic maternal/newborn urgent-safety routing.

## What this scaffold includes

- **Expo + TypeScript app shell** with a mobile-first six-module birth-preparation roadmap.
- **Firebase Authentication** with persisted mobile sessions, anonymous starter access, and Email/Password service boundaries.
- **User bootstrap flow** that provisions `users/{uid}` only after Authentication establishes a session.
- **Typed domain model** for course modules, progress, clinical content blocks, source records, reviews, and care-team contacts.
- **Demo course data** matching the six-module MVP.
- **Secure local contact store** using `expo-secure-store` for care-team contact scaffolding. Secure local storage is a convenience cache, not the system of record for irreplaceable information.
- **Clinical-content governance services** for source records, draft/review/approve/publish/freeze states, and Firebase admin-claim checks.
- **Firestore Security Rules, Emulator Suite tests, and CI** that separate clinician-published curriculum from user-owned progress, plans, contacts, and future support-person sharing.
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

4. In Firebase Authentication, enable **Anonymous** access for the starter experience. Enable **Email/Password** only when its user-facing registration and sign-in screens are ready.

5. Start Expo:

   ```bash
   npm start
   ```

6. Run TypeScript validation:

   ```bash
   npm run typecheck
   ```

7. Run the authorization suite against local Firebase emulators:

   ```bash
   npm run test:emulators
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

### Authentication and profile bootstrap

The app presents the course shell when Firebase is unconfigured. Once Firebase is configured, `BabyReadyAuthProvider` watches the auth session, starts an anonymous session when no user is present, and attempts to provision `users/{uid}` in Firestore.

Email/Password registration and sign-in are available as service functions for the forthcoming onboarding screens. They are intentionally not exposed in the current starter UI. Mobile Auth persistence uses AsyncStorage; web uses Firebase's standard web Auth session handling.

### Clinician content review workspace

The learner shell includes an explicit **Open clinician content review** entry point for Sprint 1 testing. The workspace verifies the current Firebase ID token before it subscribes to a live Firestore review queue. Accounts without the `admin: true` custom claim see an access explanation and cannot load clinical content.

For a selected content block, reviewers can inspect learner-facing copy and linked source records, write review notes, set the next review date, submit a draft, approve submitted content, publish approved content, or freeze content with a documented reason. Approval independently verifies that each linked source record exists and is in the `published` state. Publication requires the protected approval metadata already enforced by Firestore rules.

### Clinician source library

The clinician workspace includes a source-record authoring and publishing screen.
Clinicians can create records with a stable ID, organization, title, canonical
URL, and review dates; save records as drafts; publish only complete, current
records; and freeze a source with a documented reason. Publishing is deliberately
separate from drafting so referenced content cannot be approved until its
supporting source has been reviewed and published.

### Clinician content authoring

Clinicians can author structured content blocks for a course, module, and
lesson; select the learner-facing content format; mark whether the block is a
clinical claim; attach one or more currently published sources; save a draft;
and submit the completed block to the clinical review queue. Submission
revalidates every source attachment so a frozen or unpublished source cannot
reach review as supporting evidence.

### Draft revisions and version history

The clinical review queue offers an **Edit draft** action that reopens a draft
in the authoring workspace while preserving and locking its course, module,
lesson, and block identifiers. Every draft save and workflow transition
(submission, approval, publication, or freeze) creates a numbered snapshot in
the block's `versions` subcollection. Version records are append-only:
administrators may read or create valid snapshots, but Firestore rules reject
updates and deletion.

When two or more snapshots exist, a clinician can choose any timeline entry as
the baseline and any other entry for comparison. The review workspace defaults
to the oldest and newest revisions, displays the two snapshots side by side,
summarizes learner-copy and source-attachment changes, and provides a
word-level copy diff. Removed passages are shown with a strike-through and
inserted passages are highlighted. The comparison is read-only and never
changes version history.

Clinicians can export the selected two-revision comparison as a clinician-ready
PDF audit. The report includes immutable snapshot metadata, workflow actions,
the word-level copy diff, attached source record IDs and source changes, the
exporting user ID, and a point-in-time export timestamp. Native apps create a
PDF and open the system share sheet; the web app opens the browser print dialog
so the reviewer can save the report as a PDF.

Every successful export attempt is also recorded in an immutable,
administrator-only `comparisonAuditExports` Firestore subcollection. Each log
entry contains the content scope, compared revision IDs and version numbers,
PDF route, clinician ID, and a server timestamp. The review workspace shows the
ten most recent audit exports for the selected content block.

The clinician workspace also includes a cross-content audit-export dashboard.
It reads the 200 most recent immutable records through a Firestore
collection-group query and filters them by content scope, exporting clinician,
PDF route, date range, and either compared version number.
Clinicians can export the current filtered record set as a spreadsheet-safe CSV,
with browser download on web and a saved file plus share sheet on native apps.
They can also export the same result set as a clinician-ready PDF dashboard
report. That report includes the applied filters, reporting clinician,
point-in-time timestamp, and each matching immutable audit record. On web,
the app opens the browser print dialog so the reviewer can save the report as
a PDF; native apps create a PDF and open the system share sheet.

### Local Emulator Suite

Set the following development-only values to connect the app to local Auth and Firestore emulators:

```bash
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1
EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT=9099
EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT=8080
```

Use a reachable LAN IP instead of `127.0.0.1` for a physical device. The repository's test command starts isolated Auth and Firestore emulators automatically:

```bash
npm run test:emulators
```

### Firestore rules

`firestore.rules` now enforces this Sprint 1 policy:

- Published course content and sources are readable; drafts and review material remain admin-only.
- Only Firebase users with an `admin: true` custom claim can create, review, approve, publish, freeze, or update clinical content and source records.
- A clinical claim cannot enter the `published` state without source IDs, a reviewer ID, and review timestamps.
- Progress, plans, and care-team contacts remain inside `users/{uid}`.
- Safety events are server-write only.
- Support-person invitations are scoped and revocable; invitees can only accept or decline and cannot alter sharing scope.

The `tests/firestore.rules.test.mjs` suite covers public/draft content visibility, admin-only curriculum writes, clinical-claim metadata, source-record completeness, user data isolation, safety-event protection, and constrained support invitations. GitHub Actions runs type checking and this emulator suite on pull requests and updates to `main`.

Custom claims must be minted only by a trusted server-side Admin SDK workflow. The Expo client checks the claim for early feedback, while Firestore Security Rules remain the authoritative enforcement layer. Do not use broad `allow read, write: if true` rules at any stage.

## Project layout

```text
.
├── App.tsx                         # Course shell with Firebase auth status
├── .github/workflows/verify.yml    # Typecheck + Firestore Emulator CI
├── src/
│   ├── auth/AuthProvider.tsx        # Auth session context and bootstrap
│   ├── components/ModuleCard.tsx    # Reusable roadmap module card
│   ├── config/env.ts                # Public Expo Firebase config boundary
│   ├── data/course.ts               # Six-module seed data
│   ├── lib/firebase.ts              # Auth, Firestore, and emulator initialization
│   ├── models/course.ts              # Shared domain types
│   ├── screens/ClinicianContentAuthoringScreen.tsx # Clinical content composer
│   ├── screens/ClinicianReviewScreen.tsx # Admin-gated content review workspace
│   ├── screens/ClinicianSourceLibraryScreen.tsx # Source authoring and publishing
│   └── services/
│       ├── authService.ts            # Anonymous and email/password flows
│       ├── clinicalReviewQueueService.ts # Live review queue and source lookup
│       ├── contentGovernanceService.ts # Clinical-content lifecycle
│       ├── sourceService.ts          # Source draft, publishing, and freeze lifecycle
│       ├── userProfileService.ts     # users/{uid} provisioning
│       └── contactStore.ts           # Secure local care-team contact cache
├── firestore.rules                  # Firestore security baseline
├── firestore.indexes.json
├── firebase.json
├── tests/firestore.rules.test.mjs    # Emulator authorization suite
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

1. Create the Firebase project, populate local `.env`, and enable Anonymous Authentication for development.
2. Implement a trusted Admin SDK workflow for setting clinician/admin custom claims; never mint claims in the client.
3. Build the clinician content authoring and review screens on top of the Sprint 1 governance services.
4. Replace demo seed material only after it passes clinical review, has source records, and is published through the protected workflow.
5. Implement the emergency safety router before enabling any generative AI lesson companion.

## References

- [Expo SDK 57 SecureStore documentation](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/)
- [Firebase Firestore Security Rules documentation](https://firebase.google.com/docs/firestore/security/get-started)
