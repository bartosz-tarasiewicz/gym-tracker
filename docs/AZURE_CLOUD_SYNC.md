# Gym Tracker — Azure cloud sync (v0.3)

## Architecture
- Static PWA: Azure Static Web Apps Free.
- Integrated managed Azure Functions API: authenticated GET/PUT /api/snapshot.
- Backend: Azure Table Storage, one gzip-compressed snapshot entity per identity-provider + user ID.
- Frontend local-first IndexedDB/localStorage, with cloud ETag checks to prevent overwrites.
- If cloud is offline/unconfigured/unauthenticated, the app **still saves locally** and displays a warning.

## ONE-TIME AZURE CONFIGURATION (must not be committed)
1. In Azure Portal, create a **Storage Account** in an available region. Standard/general-purpose v2, LRS. Storage incurs usage-based charges; check cost limits/alerts. No container or table needs to be created manually.
2. Under Storage Account > Access keys, copy its **connection string**; do not paste it in a chat or GitHub.
3. Open your existing resource **gym-tracker** (Static Web App) > Settings > Environment variables > Production.
4. Add the app setting named GYM_STORAGE_CONNECTION_STRING with the storage connection string as its **value**. Apply/save.
5. The API automatically creates the Table Storage table GymTrackerData on first authenticated request. No secret may appear in browser code.
6. Open Gym Tracker > Dane > **Zaloguj przez GitHub**, then press **Synchronizuj teraz**. On the second device sign in with the same GitHub identity.

The existing Static Web Apps deployment token alone **cannot** create the Storage Account or set Azure application settings. This requires Azure Portal or an Azure management connection.

## Conflict-handling / data safety
- Every local change saves immediately in localStorage and asynchronously in IndexedDB.
- While signed in, the app requests the latest remote ETag and uploads only when its last known ETag matches. Concurrent edits do not silently overwrite.
- The first time an existing populated local journal meets a different remote journal, the UI stops in **conflict** status. The user chooses **Użyj danych z Azure** or **Wyślij lokalne do Azure**; each choice first downloads a JSON backup of the dataset that will be replaced.
- Offline or server errors never erase the local data.
- On a fresh empty device, cloud data is restored automatically after login.
- Simultaneous multi-device editing of the exact same workout requires manual conflict resolution; automatic per-set merging is intentionally **not** claimed.

## Security
- /api/* requires Static Web Apps authenticated role.
- Function also requires x-ms-client-principal auth data from the SWA platform.
- Table partition keys are SHA-256 of provider + userId, not supplied by clients.
- Storage connection string stays server-side in an app setting.
- Service worker never caches /api/* or /.auth/*.
- Built-in GitHub authentication on Static Web Apps Free permits any GitHub user to log in, but data is segregated by identity.

## Troubleshooting
- “Azure Storage nie jest jeszcze skonfigurowany” — add the environment variable.
- “Konflikt danych” — two differing snapshots; export backups then choose the source.
- “Synchronizacja niedostępna” — backend/connection/network issue; local save continues.
- In Azure workflow log verify the managed API was built from the api directory and deployed.
