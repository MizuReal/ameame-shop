const express = require("express");

const {
  listProductReviews,
  createReview,
  getMyReview,
  updateReview,
  deleteReview,
} = require("../controllers/reviewController");
const { requireFirebaseAuth } = require("../middleware/requireFirebaseAuth");

const router = express.Router();

router.get("/v1/products/:id/reviews", listProductReviews);
router.get("/v1/reviews/me", requireFirebaseAuth, getMyReview);
router.post("/v1/reviews", requireFirebaseAuth, createReview);
router.patch("/v1/reviews/:id", requireFirebaseAuth, updateReview);
router.delete("/v1/reviews/:id", requireFirebaseAuth, deleteReview);

module.exports = router;
