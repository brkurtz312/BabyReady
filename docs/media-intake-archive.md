# Media Intake archive

**Status:** Archived on 2026-08-15.

BabyReady is prioritizing the virtual childbirth education experience. The Media Intake implementation is retained in Git for future reuse, but it is not part of the active clinician workflow or production deployment path.

## What remains in the repository

- The Cloud Run worker source in `services/media-intake-worker/`.
- The deployment and bootstrap scripts in `scripts/`.
- The clinician intake screen, service, data models, Firestore rules, and tests.
- The original implementation plan and historical deployment documentation.
- The former GitHub Actions workflow at `.github/archived-workflows/deploy-media-intake.yml`.

## What is disabled

- The GitHub Actions deployment workflow is no longer under `.github/workflows`, so GitHub cannot discover or manually run it.
- `npm run deploy:media-intake-worker` exits before checking or calling Google Cloud.
- The clinician review workspace no longer exposes Media Intake navigation.

## Cloud resources

This archive does not delete or mutate any Google Cloud resource. Existing Cloud Run, IAM, Workload Identity Federation, Artifact Registry, and Firestore-rules resources remain available for review, future cleanup, or a deliberate restart.

## Reactivating Media Intake

Only resume this work through a deliberate decision. Before doing so:

1. Confirm that the Cloud Run front-door routing and authenticated health-check issue is resolved.
2. Review the retained Google Cloud identities and IAM bindings against least-privilege requirements.
3. Remove the archive guard from `scripts/deploy-media-intake-worker.mjs`.
4. Move `.github/archived-workflows/deploy-media-intake.yml` back into `.github/workflows/`.
5. Restore the clinician navigation only after the user experience and governance workflow are again in scope.
6. Validate the worker, Firestore rules, and deployment workflow before any protected production deployment.
7. Set `EXPO_PUBLIC_MEDIA_INTAKE_WORKER_URL` only after the deployed service passes the approved health checks.

The virtual childbirth education experience is the active BabyReady product direction while this archive remains in effect.
