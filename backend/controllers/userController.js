const { cloudinary } = require("../config/cloudinary");
const { sendError } = require("../utils/errorResponse");
const { createOrUpdateUserFromFirebase } = require("../utils/userSync");

function toUploadedImage(file) {
  if (!file) {
    return null;
  }

  return {
    url: file.path || file.secure_url || "",
    public_id: file.filename || file.public_id || "",
  };
}

async function updateMyProfile(req, res, next) {
  try {
    const user = await createOrUpdateUserFromFirebase(req.firebaseUser);

    if (user.isActive === false) {
      return sendError(
        res,
        403,
        "ACCOUNT_DEACTIVATED",
        "Your account is deactivated. Please contact an administrator."
      );
    }

    if (typeof req.body.displayName === "string") {
      const trimmed = req.body.displayName.trim();
      if (!trimmed) {
        return sendError(res, 400, "VALIDATION_ERROR", "displayName cannot be empty.");
      }
      user.displayName = trimmed;
    }

    if (typeof req.body.addressLine1 === "string") {
      user.addressLine1 = req.body.addressLine1.trim();
    }

    if (typeof req.body.city === "string") {
      user.city = req.body.city.trim();
    }

    if (typeof req.body.province === "string") {
      user.province = req.body.province.trim();
    }

    if (typeof req.body.postalCode === "string") {
      user.postalCode = req.body.postalCode.trim();
    }

    const uploadedImage = toUploadedImage(req.file);
    if (uploadedImage?.url && uploadedImage?.public_id) {
      const previousPublicId = user.photoPublicId;
      user.photoURL = uploadedImage.url;
      user.photoPublicId = uploadedImage.public_id;

      if (previousPublicId) {
        await cloudinary.uploader.destroy(previousPublicId).catch(() => null);
      }
    }

    await user.save();

    return res.status(200).json({
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
  updateMyProfile,
};
