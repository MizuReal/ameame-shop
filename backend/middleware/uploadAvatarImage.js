const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const { cloudinary } = require("../config/cloudinary");

const avatarImageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => ({
    folder: "ameame/avatars",
    resource_type: "image",
    format: file.mimetype === "image/png" ? "png" : "jpg",
  }),
});

function imageFileFilter(_req, file, cb) {
  if (!file?.mimetype?.startsWith("image/")) {
    return cb(new Error("Only image uploads are allowed."));
  }

  return cb(null, true);
}

const uploadAvatarImage = multer({
  storage: avatarImageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = {
  uploadAvatarImage,
};
