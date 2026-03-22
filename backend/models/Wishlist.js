const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    lastNotifiedDiscountAt: {
      type: Date,
      default: null,
    },
    lastNotifiedDiscountPercent: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

wishlistSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.models.Wishlist || mongoose.model("Wishlist", wishlistSchema);
