const express = require("express");

const { listUsers, updateUser } = require("../controllers/adminUserController");
const { requireFirebaseAuth } = require("../middleware/requireFirebaseAuth");
const { requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

router.use("/v1/admin", requireFirebaseAuth, requireAdmin);
router.get("/v1/admin/users", listUsers);
router.patch("/v1/admin/users/:userId", updateUser);

module.exports = router;
