# Render Deployment Guide (Backend API)

This project should be deployed to Render as a **Web Service** from the `backend/` directory.

## 1) Create the Render service

1. Push the repository to GitHub/GitLab.
2. In Render: `New` -> `Web Service`.
3. Connect your repo.
4. Configure:
- Name: `ameame-backend` (or your preferred name)
- Environment: `Node`
- Region: pick closest to your users/database
- Branch: your deployment branch (`main`/`master`)
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

## 2) Set environment variables in Render

Set these in `Service -> Environment`.

Required:

```env
MONGODB_URI=<your mongodb connection string>
APP_JWT_SECRET=<strong random secret>
```

Firebase (required if using Firebase login):

```env
FIREBASE_PROJECT_ID=<firebase project id>
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"..."}
```

Cloudinary (required for product image upload):

```env
CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<api key>
CLOUDINARY_API_SECRET=<api secret>
```

Optional but recommended:

```env
APP_JWT_EXPIRES_IN=7d
WISHLIST_DISCOUNT_SIGNIFICANT_PERCENT=10
DEBUG_PUSH_NOTIFICATIONS=0
```

Notes:
- `PORT` is provided by Render automatically; no need to set it manually.
- Keep `FIREBASE_SERVICE_ACCOUNT_JSON` as valid JSON. `private_key` must include escaped newlines (`\n`).

## 3) Deploy

1. Click `Create Web Service`.
2. Wait for first deploy to complete.
3. Ensure logs show `Backend listening on port ...`.

## 4) Health check and API URL

- Health endpoint: `GET /health`
- Example: `https://<your-render-service>.onrender.com/health`
- API base for clients: `https://<your-render-service>.onrender.com/api`

## 5) Connect mobile frontend

In frontend environment config, set:

```env
EXPO_PUBLIC_API_BASE_URL=https://<your-render-service>.onrender.com/api
```

Rebuild/restart the app after changing the API base URL.

## 6) Verify after deploy

1. `GET /health` returns `200` with `{ "status": "ok" }`.
2. Test one authenticated route (login/session).
3. Test one DB-backed route (products/categories).
4. Test image upload (Cloudinary integration).
5. If push notifications are enabled, update an order status and check push logs.

## 7) Common failures

- `MONGODB_URI is required.`
  - `MONGODB_URI` missing in Render env.
- `APP_JWT_SECRET is required.`
  - `APP_JWT_SECRET` missing.
- `FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON.`
  - JSON malformed or missing escaped newlines in `private_key`.
- Cloudinary upload errors
  - Verify all 3 Cloudinary env vars are set correctly.
