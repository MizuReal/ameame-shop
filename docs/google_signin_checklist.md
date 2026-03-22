# Google Sign-In Migration Checklist (`react-native-google-signin`)

## 1. Dependency and App Type

- [ ] `@react-native-google-signin/google-signin` is installed in `frontend/package.json`.
- [ ] App is run as a native build (`expo run:android` / `expo run:ios` or EAS build), not Expo Go.
- [ ] `frontend/screens/user/Login.js` imports `GoogleSignin` from `@react-native-google-signin/google-signin` (no `expo-auth-session` flow).

## 2. Google Cloud Console

- [ ] In Google Cloud, API `Google Identity Services` is enabled.
- [ ] OAuth consent screen is configured (app name, support email, scopes, test users if External in testing mode).
- [ ] OAuth Client IDs exist for:
- [ ] Web application client (used as `webClientId` for Firebase token exchange).
- [ ] Android client (package name + SHA-1/SHA-256).
- [ ] iOS client (bundle identifier).

## 3. Firebase Console

- [ ] In Firebase Authentication, provider `Google` is enabled.
- [ ] Google provider uses the same project as your OAuth clients.
- [ ] Support email is set for Google provider.
- [ ] Web client ID in app env (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`) matches the OAuth Web client from Google Cloud.

## 4. Android Native Setup

- [ ] Package name in Firebase Android app matches app package in `frontend/android/app/build.gradle` (`applicationId`).
- [ ] `frontend/android/app/google-services.json` belongs to this Firebase project/package.
- [ ] `google-services.json` includes a non-empty `oauth_client` array for the Android app client.
- [ ] SHA-1 and SHA-256 fingerprints for debug and release keys are added in Firebase Android app settings.
- [ ] If using Play App Signing, upload and app signing SHA certs are also registered.

## 5. iOS Native Setup

- [ ] iOS bundle identifier matches Firebase iOS app setup.
- [ ] `GoogleService-Info.plist` is correctly configured in iOS project (if required by your setup).
- [ ] URL scheme includes reversed client ID from iOS OAuth client.
- [ ] `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` matches iOS OAuth client ID.

## 6. App Environment Variables

- [ ] `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is present.
- [ ] `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` is present for iOS builds.
- [ ] Values do not contain extra spaces or quote artifacts.

## 7. Functional Verification

- [ ] App launches without runtime import/module errors.
- [ ] Google button is enabled (indicates config is loaded).
- [ ] Android: sign-in opens Google account picker and returns to app.
- [ ] iOS: sign-in opens native Google flow and returns to app.
- [ ] Firebase user session is created after Google login.
- [ ] Existing email/password login still works.
- [ ] Cancel flow shows a friendly non-crashing message.

## 8. Troubleshooting Quick Map

- `ERR_CONFIG`:
- [ ] Verify OAuth client IDs and env vars.
- [ ] Verify package name/bundle ID and SHA cert registration.

- `PLAY_SERVICES_NOT_AVAILABLE` (Android):
- [ ] Update Google Play Services on device/emulator.

- Missing `idToken`:
- [ ] Confirm `webClientId` is set and points to OAuth Web client.
- [ ] Rebuild app after env/config changes.

- Firebase auth errors (`auth/...`):
- [ ] Confirm Google provider is enabled in Firebase Auth.
- [ ] Confirm app is linked to correct Firebase project.
