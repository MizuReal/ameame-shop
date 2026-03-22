const express = require("express");

const { requireFirebaseAuth } = require("../middleware/requireFirebaseAuth");
const { uploadAvatarImage } = require("../middleware/uploadAvatarImage");
const { updateMyProfile } = require("../controllers/userController");

const router = express.Router();

router.patch(
  "/v1/users/me",
  requireFirebaseAuth,
  uploadAvatarImage.single("avatar"),
  updateMyProfile
);

module.exports = router;
