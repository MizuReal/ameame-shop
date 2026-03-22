# Frontend Deployment Guide (Expo + EAS)

This guide explains how to deploy the React Native frontend in `frontend/`.
It covers Android builds first (matching the current project setup), and includes iOS notes.

## 1) Deployment Model

This project deploys in two parts:

- Backend API: deploy `backend/` to Render.
- Mobile app frontend: build with Expo EAS from `frontend/` and distribute the build.

Important:
- You do not deploy this mobile frontend to Render.
- The app must point to your deployed backend URL.

## 2) Prerequisites

- Node.js and npm installed.
- Expo account and access to project owner `mizureal`.
- EAS CLI available through `npx eas`.
- Backend already deployed and reachable over HTTPS.
- Firebase Android app configured.

From repo root:

```bash
cd frontend
npm install
```

## 3) Verify App Configuration

Check `frontend/app.json` contains:

- `expo.android.package`: `com.ameameshop.app`
- `expo.android.googleServicesFile`: `./google-services.json`
- `expo.extra.eas.projectId`: `adcb6870-b2f0-4267-8649-7e0186fa2e72`

Check `frontend/eas.json` has at least these build profiles:

- `development`
- `preview`
- `production`

## 4) Environment Variables (Critical)

Local `.env` is for local dev. Cloud EAS builds should use EAS environment variables.

Set these in Expo dashboard (Project -> Environment Variables), or via EAS CLI:

```env
EXPO_PUBLIC_API_BASE_URL=https://<your-render-service>.onrender.com/api
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_EAS_PROJECT_ID=adcb6870-b2f0-4267-8649-7e0186fa2e72
EXPO_PUBLIC_DEBUG_PUSH_NOTIFICATIONS=0
```

Notes:
- Replace LAN IP values like `http://192.168.x.x:4000/api` with your HTTPS production API URL.
- `EXPO_PUBLIC_*` values are embedded in the app and are not secrets.
- Keep private secrets out of frontend env.

## 5) Android Push Credentials (One-Time)

If using push notifications, configure FCM V1 credentials in EAS.

```bash
cd frontend
npx eas login
npx eas credentials --platform android
```

In the prompt, choose setup for Google Service Account Key for Push Notifications and upload the Firebase service-account JSON file.

Do not upload `google-services.json` here. That file is already referenced by `app.json`.

## 6) Build Types and Commands

From `frontend/`:

### Development build (APK, internal)

```bash
npx eas build --platform android --profile development
```

Use this for native debugging and device testing.

### Preview build (internal distribution)

```bash
npx eas build --platform android --profile preview
```

Use this for QA/stakeholder testing before release.

### Production build

```bash
npx eas build --platform android --profile production
```

Use this for Play Store-ready releases.

## 7) Distribute Android Builds

After each build finishes:

- Download artifact from EAS build page.
- `development` usually produces APK (install directly).
- `production` typically produces AAB for Play Console submission.

Optional submit helper:

```bash
npx eas submit --platform android --profile production
```

## 8) iOS Notes

`app.json` already includes `ios.bundleIdentifier` (`com.ameameshop.app`).

When ready for iOS:

```bash
cd frontend
npx eas build --platform ios --profile production
```

You will need Apple Developer account setup and iOS credentials through EAS.

## 9) Recommended Release Checklist

1. Confirm backend `/health` is healthy.
2. Confirm `EXPO_PUBLIC_API_BASE_URL` points to deployed backend.
3. Build `preview` and test login, product list, checkout flow, push notifications.
4. Build `production` after QA passes.
5. Submit AAB to Play Console and run internal testing rollout first.

## 10) Common Issues

- App still calls local API:
  - Production EAS env still has LAN IP value.
- Google login fails in release:
  - SHA fingerprints missing in Firebase Android app settings.
- Push notifications fail:
  - FCM V1 service account not uploaded in EAS credentials.
- Build uses old env values:
  - Rebuild after updating EAS env vars.

## 11) Quick Command Reference

```bash
cd frontend
npm install
npx eas login
npx eas build --platform android --profile preview
npx eas build --platform android --profile production
npx eas submit --platform android --profile production
```
