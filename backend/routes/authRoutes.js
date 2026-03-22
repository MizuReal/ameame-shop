const express = require("express");
const rateLimit = require("express-rate-limit");

const { createSession } = require("../controllers/authController");
const { requireFirebaseAuth } = require("../middleware/requireFirebaseAuth");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many authentication requests. Please try again later.",
      status: 429,
    },
  },
});

router.use(authLimiter);
router.post("/v1/auth/session", requireFirebaseAuth, createSession);

module.exports = router;
