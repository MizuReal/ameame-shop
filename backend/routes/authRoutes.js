const express = require("express");

const { createSession } = require("../controllers/authController");
const { requireFirebaseAuth } = require("../middleware/requireFirebaseAuth");

const router = express.Router();

router.post("/v1/auth/session", requireFirebaseAuth, createSession);

module.exports = router;
