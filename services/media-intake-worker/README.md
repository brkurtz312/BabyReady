# BabyReady Media Intake Worker

> **Archived on 2026-08-15.** This worker source is retained for future reuse, but its deployment path is disabled. See [the archive record](../../docs/media-intake-archive.md) before attempting any reactivation.

This Cloud Run service is the trusted server-side boundary for BabyReady Media Intake. It accepts a clinician administrator’s Firebase ID token and an existing `mediaIntakes/{intakeId}` document ID. It never accepts an AI key from the mobile app, never creates learner-visible content, and never republishes third-party media.

## Required runtime configuration

- `FIREBASE_PROJECT_ID=babyready-8bfd6`
- `GOOGLE_CLOUD_PROJECT=babyready-8bfd6` when Cloud Run does not set it automatically
- `VERTEX_AI_LOCATION=us-central1` (optional; this is the default)
- `VERTEX_AI_MODEL=gemini-2.5-flash` (optional; this is the default)
- `MEDIA_INTAKE_ALLOWED_ORIGINS=https://babyready.app,https://babyready-8bfd6.web.app,https://babyready-8bfd6.firebaseapp.com` (optional; these are the defaults)

The Cloud Run service account must be permitted to verify Firebase ID tokens, read and write Firestore, and invoke the configured Vertex AI model. Do not give this service account permission to publish clinical content or modify learner records.

## Safety behavior

- Requires a Firebase token with `admin: true`.
- Accepts only existing `web_url` and `video_url` intake documents.
- Resolves and blocks private, loopback, link-local, carrier-grade NAT, and mixed private/public DNS targets.
- Pins each HTTPS request to the validated address, limits redirects, limits source size, and reads only HTML or plain text.
- Uses supplied video transcript URLs only as an accessibility signal and source reference. It does not download, copy, or rehost video.
- Saves a structured, clinician-only analysis snapshot under `mediaIntakes/{intakeId}/analyses`.
- Leaves external-video creation, source creation, clinical review, approval, and publication to the existing governed workflows.

## Local verification

```sh
npm install
npm run check
```

Deployment must use a protected Cloud Run runtime identity. Set only the public resulting service URL in the Expo environment as `EXPO_PUBLIC_MEDIA_INTAKE_WORKER_URL`.
