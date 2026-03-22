const User = require("../models/User");
const { sendError } = require("../utils/errorResponse");

async function requireAdmin(req, res, next) {
  try {
    const firebaseUser = req.firebaseUser;

    if (!firebaseUser?.uid || !firebaseUser?.email) {
      return sendError(res, 401, "INVALID_AUTH_TOKEN", "Invalid Firebase session.");
    }

    const normalizedEmail = firebaseUser.email.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ firebaseUid: firebaseUser.uid }, { email: normalizedEmail }],
    });

    if (!user || user.isActive === false || user.role !== 1) {
      return sendError(res, 403, "ADMIN_REQUIRED", "Admin access is required.");
    }

    req.currentUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireAdmin,
};
