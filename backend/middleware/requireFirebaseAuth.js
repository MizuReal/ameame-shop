const { verifyFirebaseIdToken } = require("../services/firebaseAuthService");
const User = require("../models/User");
const { verifyAppJwt } = require("../utils/appJwt");
const { sendError } = require("../utils/errorResponse");

function getBearerToken(authorizationHeader = "") {
  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function getFirebaseTokenHeader(req) {
  const firebaseTokenHeader = req.headers["x-firebase-token"];

  if (typeof firebaseTokenHeader === "string" && firebaseTokenHeader.trim()) {
    return firebaseTokenHeader.trim();
  }

  return null;
}

function getAnyAuthToken(req) {
  // Prefer explicit Firebase token when both are present.
  // This prevents stale app JWTs from a previous account from taking precedence.
  const firebaseToken = getFirebaseTokenHeader(req);
  if (firebaseToken) {
    return firebaseToken;
  }

  const bearerToken = getBearerToken(req.headers.authorization);

  if (bearerToken) {
    return bearerToken;
  }

  return null;
}

async function tryAppJwtAuth(token, req) {
  const payload = verifyAppJwt(token);

  if (!payload?.sub && !payload?.email) {
    return false;
  }

  const query = [];

  if (payload.sub) {
    query.push({ _id: String(payload.sub) });
  }

  if (payload.email) {
    query.push({ email: String(payload.email).trim().toLowerCase() });
  }

  const user = await User.findOne({ $or: query });

  if (!user || user.isActive === false) {
    return false;
  }

  req.currentUser = user;
  req.firebaseUser = {
    uid: user.firebaseUid,
    email: user.email,
  };

  return true;
}

async function requireFirebaseAuth(req, res, next) {
  const token = getAnyAuthToken(req);

  if (!token) {
    return sendError(res, 401, "MISSING_AUTH_TOKEN", "Missing authentication token.");
  }

  try {
    const appJwtValid = await tryAppJwtAuth(token, req).catch(() => false);

    if (appJwtValid) {
      return next();
    }

    req.firebaseUser = await verifyFirebaseIdToken(token);
    return next();
  } catch (error) {
    const statusCode = error.statusCode === 401 ? 401 : 500;
    const message =
      statusCode === 401
        ? "Invalid or expired Firebase session."
        : error.message || "Unable to validate Firebase session.";
    const code = statusCode === 401 ? "INVALID_AUTH_TOKEN" : "INTERNAL_ERROR";

    return sendError(res, statusCode, code, message);
  }
}

module.exports = {
  requireFirebaseAuth,
};
