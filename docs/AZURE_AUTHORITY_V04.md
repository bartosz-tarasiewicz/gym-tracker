# Gym Tracker v0.4 — Azure as source of truth

## Architecture

- **Azure Table Storage is authoritative**, keyed to the authenticated GitHub identity.
- Each draft/finished workout is a **separate Azure Table entity** and has its own opaque ETag.
- Browser IndexedDB/localStorage remains a **recovery cache** for lost connectivity, not a peer master.
- The v0.4 queue stores **pending per-workout operations**, the ETag they were based on, and the user's latest intended data.
- Each input updates local recovery storage **immediately**, and the cloud operation is automatically sent after a short debounce.
- A simultaneous update to a **different** workout does not block this workout. A conflict in the **same** workout is stopped without overwriting.
- Azure Static Web Apps built-in GitHub login authenticates every data API endpoint.

## Migration and rollback

On the first authenticated `GET /api/workouts`:

1. The API checks a migration marker for this GitHub user.
2. If missing, it reads the **existing v0.3 snapshot** from Azure Table Storage.
3. It creates separate `draft:` and `history:` rows. Duplicate history items are preserved with unique stable migration IDs.
4. Only after all rows are created does it write the migration marker.
5. The original `snapshot` row is **retained** as a rollback backup. The v0.4 client does not write to that legacy row.

This is a non-destructive migration. A deleted local browser cache must **never** cause automatic deletion of remote workouts. The only automatic deletion of a draft workout is explicitly initiated by pressing "Zakończ trening"; the completed history row is uploaded **first**, before the draft is removed.

## Offline and concurrency behavior

1. Online: load cloud state after login; cache it locally.
2. Offline: keep edits locally and persist a queue; never tell the user they were uploaded.
3. Back online: read remote revisions and replay queued operations with matching ETags.
4. If a remote revision changed for the **same workout**, stop that workout, present local/Azure comparison, require a combined JSON backup and explicit choice.
5. On a different device, the latest cloud state is loaded. Changes to unrelated workouts do not conflict.

The browser cache does not replace a backup strategy. Continue to export JSON periodically; a formal automated backup and retention policy is a future improvement.

## Security and limits

- Authenticated API only: `GET /api/workouts`, `PUT/DELETE /api/workouts/:id`.
- Azure partition key is SHA-256 of `identityProvider:userId`, never supplied by browser.
- Per-record 400 KB uncompressed / 60 KB compressed payload cap; Table Storage property limit observed.
- No credentials in JavaScript or GitHub. `GYM_STORAGE_CONNECTION_STRING` remains an Azure app setting.
- Anonymous `GET /api/health` only reports non-sensitive availability, not data.
- The service worker does not cache `/api/*` or `/.auth/*`.

## Testing

CI covers migrated snapshot preservation, multiple history records, user isolation, ETag concurrency, deletion, oversized records, two-device browser flows, offline edits across reloads and the live Azure deployment.

Avoid inserting test workouts into the **real user's GitHub account**. GitHub Actions uses an isolated mock identity and mock Azure API for write tests. Post-deployment live smoke verifies site and authorization without writing to the user's private journal.
