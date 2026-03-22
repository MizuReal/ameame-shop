# Deployment And Release Guide

This guide covers:
- Backend deployment preparation
- Android app build/deploy commands (Expo + EAS)
- Push notification credential setup
- Two-device push notification QA workflow

## 1) Prerequisites

- Node.js and npm installed
- Expo CLI (via `npx expo ...`)
- EAS CLI (via `npx eas ...`)
- Firebase project configured (`ameame-shop`)
- MongoDB database URL
- Cloudinary credentials

## 2) Environment Variables

### Backend (`backend/.env`)

Required at minimum:

```env
PORT=4000
MONGODB_URI=...
JWT_SECRET=...
JWT_EXPIRES_IN=7d
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Optional during debugging:

```env
DEBUG_PUSH_NOTIFICATIONS=1
```

### Frontend (`frontend/.env`)

```env
EXPO_PUBLIC_API_BASE_URL=http://<LAN-IP>:4000/api
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_EAS_PROJECT_ID=adcb6870-b2f0-4267-8649-7e0186fa2e72
```

Optional during debugging:

```env
EXPO_PUBLIC_DEBUG_PUSH_NOTIFICATIONS=1
```

## 3) One-Time App Config Checks

Make sure these are set:

- `frontend/app.json`
- `expo.android.package`: `com.ameameshop.app`
- `expo.android.googleServicesFile`: `./google-services.json`
- `expo.plugins` includes `expo-notifications`
- `expo.extra.eas.projectId` is set

File placement:

- Put Firebase Android client config at: `frontend/google-services.json`

## 4) Install Dependencies

```bash
cd /home/jensen/Mobile/ameame/backend
npm install

cd /home/jensen/Mobile/ameame/frontend
npm install
```

## 5) Run Locally (Dev)

### Backend

```bash
cd /home/jensen/Mobile/ameame/backend
npm run dev
```

### Frontend Android (physical device or emulator)

```bash
cd /home/jensen/Mobile/ameame/frontend
npx expo prebuild --clean
npx expo run:android --device
```

Notes:
- Use `--device` to choose a connected Android phone/emulator.
- If prompted, select your target device.

## 6) Configure Expo Push Credentials (FCM V1)

This is required for real Android push delivery.

1. Generate Firebase Service Account key JSON:
- Firebase Console -> Project Settings -> Service Accounts
- Click `Generate new private key`

2. Upload to Expo credentials:

```bash
cd /home/jensen/Mobile/ameame/frontend
npx eas login
npx eas credentials --platform android
```

Choose:
- `Set up a Google Service Account Key for Push Notifications (FCM V1)`
- Upload the service-account JSON (not `google-services.json`)

## 7) Build For Deployment (Android)

From `frontend/`:

```bash
npx eas build --platform android --profile production
```

For internal QA builds:

```bash
npx eas build --platform android --profile preview
```

For dev-client build:

```bash
npx eas build --platform android --profile development
```

## 8) Backend Deployment (Generic)

Use your host of choice (Render/Railway/VPS). Minimum production command:

```bash
cd /home/jensen/Mobile/ameame/backend
npm start
```

Set all backend env vars in host settings.

## 9) Push Notification QA Workflow (Two Devices)

Recommended setup:
- Device A: Buyer account (role 0)
- Device B: Admin account (role 1)

Commands:

```bash
cd /home/jensen/Mobile/ameame/frontend
npx expo prebuild --clean
npx expo run:android --device
# choose phone

# open another terminal
cd /home/jensen/Mobile/ameame/frontend
npx expo run:android --device
# choose emulator or second device
```

Test flow:
1. Buyer places order.
2. Admin updates order status (`pending -> paid -> shipped -> completed`).
3. Buyer device should receive notification.
4. Tapping notification should open order details.

## 10) Troubleshooting

### `session token missing`
- Frontend did not send push token.
- Check notification permission and frontend env values.

### `expo ticket error ... InvalidCredentials`
- FCM V1 credentials missing in Expo.
- Re-run `npx eas credentials --platform android` and upload Firebase service-account JSON.

### Token exists but no notification shown
- Confirm app notification permission is allowed in Android settings.
- Confirm order owner is the same user who registered the push token.
- Use separate buyer and admin accounts for cleaner testing.
