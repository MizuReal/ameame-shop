const express = require("express");

const { requireFirebaseAuth } = require("../middleware/requireFirebaseAuth");
const {
  listWishlist,
  getWishlistStatus,
  addToWishlist,
  removeFromWishlist,
} = require("../controllers/wishlistController");

const router = express.Router();

router.use("/v1/wishlist", requireFirebaseAuth);
router.get("/v1/wishlist", listWishlist);
router.get("/v1/wishlist/status", getWishlistStatus);
router.post("/v1/wishlist", addToWishlist);
router.delete("/v1/wishlist/:productId", removeFromWishlist);

module.exports = router;
