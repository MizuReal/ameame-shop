const express = require("express");

const {
  listReviews,
  getReview,
  updateReview,
  deleteReview,
  listReviewSuggestions,
} = require("../controllers/adminReviewController");
const { requireFirebaseAuth } = require("../middleware/requireFirebaseAuth");
const { requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

router.use("/v1/admin", requireFirebaseAuth, requireAdmin);
router.get("/v1/admin/reviews", listReviews);
router.get("/v1/admin/reviews/suggestions", listReviewSuggestions);
router.get("/v1/admin/reviews/:id", getReview);
router.patch("/v1/admin/reviews/:id", updateReview);
router.delete("/v1/admin/reviews/:id", deleteReview);

module.exports = router;
