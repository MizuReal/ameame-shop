const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const { cloudinary } = require("../config/cloudinary");

const productImageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => ({
    folder: "ameame/products",
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

const uploadProductImage = multer({
  storage: productImageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
});

module.exports = {
  uploadProductImage,
};
