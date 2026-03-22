const mongoose = require("mongoose");

const User = require("../models/User");
const { sendError } = require("../utils/errorResponse");
const { getPaginationParams } = require("../utils/pagination");

function toUserDto(user) {
  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive !== false,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function listUsers(req, res, next) {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const [users, total] = await Promise.all([
      User.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("firebaseUid email displayName role isActive lastLoginAt createdAt updatedAt")
        .lean(),
      User.countDocuments({}),
    ]);

    return res.status(200).json({
      users: users.map((user) => ({
        ...user,
        id: String(user._id),
        isActive: user.isActive !== false,
      })),
      page,
      limit,
      total,
    });
  } catch (error) {
    return next(error);
  }
}

function parseRole(value) {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || ![0, 1].includes(parsed)) {
    return null;
  }

  return parsed;
}

function parseIsActive(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    return null;
  }

  return value;
}

async function updateUser(req, res, next) {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, "INVALID_USER_ID", "Invalid user id.");
    }

    const role = parseRole(req.body.role);
    const isActive = parseIsActive(req.body.isActive);

    if (role === null) {
      return sendError(res, 400, "VALIDATION_ERROR", "Role must be 0 (user) or 1 (admin).");
    }

    if (isActive === null) {
      return sendError(res, 400, "VALIDATION_ERROR", "isActive must be a boolean.");
    }

    if (role === undefined && isActive === undefined) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "At least one field is required: role or isActive."
      );
    }

    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return sendError(res, 404, "USER_NOT_FOUND", "User not found.");
    }

    if (String(targetUser._id) === String(req.currentUser._id)) {
      if (role === 0) {
        return sendError(res, 400, "VALIDATION_ERROR", "You cannot demote your own admin role.");
      }

      if (isActive === false) {
        return sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "You cannot deactivate your own account."
        );
      }
    }

    if (role !== undefined) {
      targetUser.role = role;
    }

    if (isActive !== undefined) {
      targetUser.isActive = isActive;
    }

    await targetUser.save();

    return res.status(200).json({
      user: toUserDto(targetUser),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listUsers,
  updateUser,
};
