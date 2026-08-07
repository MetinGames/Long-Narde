# Google Drive archive delivery

Last reviewed: **2026-08-07**

The `Google Drive Archive` workflow creates a timestamped ZIP, SHA-256 file,
and JSON manifest for every push to `main`, on the weekly schedule, and on a
manual dispatch. It always keeps the bundle as a GitHub Actions artifact for
30 days before attempting the durable Drive copy.

## Why the old upload failed

Google service accounts have no personal Drive storage quota and cannot own
files in **My Drive**. Sharing a personal folder with a service-account email
grants access, but it does not give that account storage. Google supports two
valid unattended routes:

1. upload as a human Drive user through OAuth; or
2. upload as a service-account member of a Google Workspace Shared Drive.

The workflow now supports both routes and fails early with an actionable
message instead of reaching Google's `storageQuotaExceeded` response.

## Route A — user OAuth for the existing My Drive folder

Use this route when the archive folder stays in a personal Drive.

1. On a trusted local machine, configure an rclone Google Drive remote named
   exactly `gdrive` with an owned Google OAuth client ID and secret.
2. Give that remote write access only to the archive location and set
   `root_folder_id` to `1OGRZ5m_-VPuNWiD4NmaGImf38Ri_NIQZ`.
3. Verify `rclone lsf gdrive:` locally.
4. Copy the complete `[gdrive]` section into the repository Actions secret
   `GDRIVE_RCLONE_CONFIG`.
5. Run `Google Drive Archive` manually and verify the ZIP, `.sha256`, and
   `.manifest.json` files in Drive.

The rclone section contains a refresh token and usually a client secret. Never
commit it, print it in logs, attach it to an Issue, or store it as a repository
variable. Rotate the OAuth client or revoke the token if it is exposed.

## Route B — service account with a Shared Drive

Use this route only when a Google Workspace Shared Drive exists.

1. Add the service account as a Shared Drive member with permission to create
   files.
2. Place the archive folder inside that Shared Drive and update
   `DRIVE_FOLDER_ID` in the workflow if its folder ID changes.
3. Store the JSON key in `GDRIVE_SERVICE_ACCOUNT_JSON`.
4. Set the repository Actions variable `DRIVE_SHARED_DRIVE_ID` to the Shared
   Drive ID.
5. Run the workflow manually and verify all three uploaded files.

A service-account JSON secret without `DRIVE_SHARED_DRIVE_ID` is rejected by
design because it cannot upload into My Drive using its own quota.

## Recovery and verification

- The GitHub artifact is the immediate recovery copy if Drive authentication
  or quota fails.
- The Drive step lists the destination and requires exact filenames for the
  archive, checksum, and manifest before the job succeeds.
- Downloaded archives should be checked with `sha256sum -c <archive>.sha256`.
- Credential rotation does not change archive contents or the 30-day fallback.

References:

- [Google Shared drives overview](https://developers.google.com/workspace/drive/api/guides/about-shareddrives)
- [rclone Google Drive configuration](https://rclone.org/drive/)
