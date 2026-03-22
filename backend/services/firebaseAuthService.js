const admin = require("firebase-admin");

function getServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw?.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (_error) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON.");
  }
}

function getFirebaseAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccount = getServiceAccountFromEnv();
  const projectId = process.env.FIREBASE_PROJECT_ID || undefined;

  if (serviceAccount) {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      ...(projectId ? { projectId } : {}),
    });
  }

  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    ...(projectId ? { projectId } : {}),
  });
}

function toAuthError(error) {
  const firebaseCode = String(error?.code || "");
  const invalidTokenCodes = new Set([
    "auth/id-token-expired",
    "auth/argument-error",
    "auth/invalid-id-token",
    "auth/id-token-revoked",
    "auth/user-disabled",
  ]);

  if (invalidTokenCodes.has(firebaseCode)) {
    const authError = new Error("Invalid or expired Firebase session.");
    authError.statusCode = 401;
    return authError;
  }

  const internalError = new Error(
    "Unable to validate Firebase session. Check Firebase Admin configuration."
  );
  internalError.statusCode = 500;
  return internalError;
}

async function verifyFirebaseIdToken(idToken) {
  if (typeof idToken !== "string" || !idToken.trim()) {
    const error = new Error("Missing Firebase token.");
    error.statusCode = 401;
    throw error;
  }

  try {
    const firebaseApp = getFirebaseAdminApp();
    const decoded = await admin.auth(firebaseApp).verifyIdToken(idToken.trim());

    return {
      uid: decoded.uid,
      email: decoded.email || "",
      displayName: decoded.name || "",
      photoURL: decoded.picture || "",
      emailVerified: Boolean(decoded.email_verified),
    };
  } catch (error) {
    throw toAuthError(error);
  }
}

module.exports = {
  verifyFirebaseIdToken,
};