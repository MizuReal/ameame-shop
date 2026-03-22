const { sendError } = require("../utils/errorResponse");
const { createOrUpdateUserFromFirebase } = require("../utils/userSync");
const { APP_JWT_EXPIRES_IN, issueAppJwt } = require("../utils/appJwt");

function normalizePushToken(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function shouldDebugPush() {
  return process.env.DEBUG_PUSH_NOTIFICATIONS === "1";
}

function maskToken(token) {
  if (!token || typeof token !== "string") {
    return "";
  }

  const trimmed = token.trim();
  if (trimmed.length <= 12) {
    return `${trimmed.slice(0, 4)}...${trimmed.slice(-2)}`;
  }

  return `${trimmed.slice(0, 8)}...${trimmed.slice(-6)}`;
}

async function createSession(req, res, next) {
  try {
    const user = await createOrUpdateUserFromFirebase(req.firebaseUser);
    const pushToken = normalizePushToken(req.body?.pushToken);

    if (user.isActive === false) {
      return sendError(
        res,
        403,
        "ACCOUNT_DEACTIVATED",
        "Your account is deactivated. Please contact an administrator."
      );
    }

    if (pushToken) {
      const existingTokens = Array.isArray(user.pushTokens) ? user.pushTokens : [];

      if (!existingTokens.includes(pushToken)) {
        user.pushTokens = [...existingTokens, pushToken].slice(-10);
        await user.save();
      }

      if (shouldDebugPush()) {
        console.log(
          `[push-debug] session token received user=${user.id} saved=${user.pushTokens.length} token=${maskToken(pushToken)}`
        );
      }
    } else if (shouldDebugPush()) {
      console.log(`[push-debug] session token missing user=${user.id}`);
    }

    const sessionToken = issueAppJwt(user);

    return res.status(200).json({
      session: {
        token: sessionToken,
        tokenType: "Bearer",
        expiresIn: APP_JWT_EXPIRES_IN,
      },
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        addressLine1: user.addressLine1 || "",
        city: user.city || "",
        province: user.province || "",
        postalCode: user.postalCode || "",
        role: user.role,
        isAdmin: user.role === 1,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createSession,
};
