# Initial Clinician Administrator Runbook

Use this runbook only to establish or revoke clinician administrator access in
the BabyReady Firebase production project, `babyready-8bfd6`. This is a
privileged production operation because the `admin: true` custom claim unlocks
clinician content governance and administrator-only audit records.

## Scope and safeguards

- The administrator claim is a role flag only. Do not place clinical, profile,
  patient, or other operational data in custom claims.
- Assign or remove claims only from a protected operator environment using the
  Firebase Admin SDK. Never use the Expo client, a browser console, or a
  Firebase configuration value exposed to the app.
- The operator must use a least-privilege service identity or Application
  Default Credentials with the Firebase Authentication permissions needed to
  manage users in `babyready-8bfd6`.
- Do not store service-account JSON, private keys, or other server credentials
  in `.env`, Expo configuration, source control, an issue, or a launch packet.
- The included command defaults to a read-only user and claim check. A change
  requires both `--apply` and an exact repeated `--confirm-email` value.

## Prerequisites

1. The intended clinician has a Firebase Authentication user record for the
   approved email address and can complete the supported sign-in path. Do not
   grant the claim to an unverified or placeholder account.
2. The operator confirms the target is the production project
   `babyready-8bfd6`, not the `babyready-rules-test` emulator project.
3. The operator environment has Application Default Credentials available,
   such as through `GOOGLE_APPLICATION_CREDENTIALS` set outside the repository
   in a protected environment.
4. The production `.env` has `FIREBASE_PROJECT_ID=babyready-8bfd6` and does
   not set `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true`.
5. The clinical lead and product owner have approved the initial administrator
   under the production launch checklist.

## Verify the target account

Run this command from a protected operator environment:

```bash
npm run clinician-admin -- --email clinician@example.com
```

The command reads the Firebase Authentication record and prints the Firebase
UID, exact email, current administrator-claim state, and custom-claim keys. It
does not modify Firebase.

If the user is not found, stop. First establish and test the intended
clinician's Firebase Authentication sign-in path. The current BabyReady starter
UI begins with anonymous sessions and does not yet expose a clinician
registration screen, so do not assume an email address automatically maps to a
usable account.

## Grant the claim

After a second-person review of the command output and target email, issue the
grant:

```bash
npm run clinician-admin -- \
  --email clinician@example.com \
  --apply \
  --confirm-email clinician@example.com
```

The tool preserves unrelated existing custom claims and adds `admin: true`.
It reads the Firebase user again after the write and fails if Firebase does not
report the expected claim state.

## Verify access in BabyReady

1. Have the clinician sign out and sign in again. If a session is already
   active, force an ID-token refresh before testing because custom claims do not
   appear in an already-issued token automatically.
2. Open the clinician workspace and confirm the account can read the review
   queue and source library.
3. Confirm the account can open the administrator-only audit-report
   verification view.
4. Confirm a standard learner account cannot perform the same actions.
5. Record the Firebase UID, validation timestamp, operator, reviewer, and
   pass/fail outcome in the production launch packet. Do not record private
   credentials or patient data.

## Revoke access

If launch verification fails or the administrator must be removed, use the same
guarded command:

```bash
npm run clinician-admin -- \
  --email clinician@example.com \
  --apply \
  --revoke \
  --confirm-email clinician@example.com
```

Revocation removes only the `admin` claim and preserves any other existing
custom claims. Have the user reauthenticate or force-refresh the ID token, then
repeat the access checks to confirm administrator-only access is denied.

## References

- Firebase custom claims and token refresh behavior:
  https://firebase.google.com/docs/auth/admin/custom-claims
- BabyReady production launch item:
  https://github.com/brkurtz312/BabyReady/issues/34
