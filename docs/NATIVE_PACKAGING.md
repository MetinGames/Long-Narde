# Native packaging handoff

Nardora keeps the browser/PWA build authoritative. Capacitor 8.5.0 wraps the
same local-only web runtime for later Android and iOS verification; this
scaffold does not publish, sign, or upload an application.

The CLI is invoked as an exact-version one-shot tool instead of a persistent
development dependency. This avoids retaining its currently reported
moderate-severity transitive `uuid` advisory in the application lockfile.

## Reproducible flow

1. Run `npm ci` and `npm run build:native-web`.
2. Review `capacitor.config.json`. Confirm `com.metingames.nardora` before any
   store record is created; changing an app identifier after release is not a
   migration.
3. On a machine with Android Studio, run `npm run native:add:android` once.
4. On macOS with Xcode, run `npm run native:add:ios` once.
5. After web changes, run `npm run native:sync` and execute both native test
   matrices. Generated native projects are local build artifacts until the
   team explicitly decides to version them.

## Assets and device gate

- Source icon: `assets/branding/icons/nardora-icon.svg`.
- Raster sources: 192 px, 512 px, maskable 512 px, and Apple touch icon are
  already present under `assets/branding/icons/`.
- Splash source: the Nardora mark and `#3b2415` background from
  `assets/branding/nardora-splash.css`.
- Generate final platform asset catalogs in Android Studio/Xcode and inspect
  crop, contrast, dark mode, launch transition, rotation, audio interruption,
  offline restart, safe areas, and back navigation on physical devices.

Signing keys, developer accounts, privacy declarations, screenshots, ratings,
regional availability, final package ID, and store submission require explicit
owner confirmation. No placeholder should be submitted as production data.
