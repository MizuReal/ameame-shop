const mongoose = require("mongoose");

const wishlistDiscountEventSchema = new mongoose.Schema(
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
    discountPercent: {
      type: Number,
      default: 0,
    },
    discountedPrice: {
      type: Number,
      default: 0,
    },
    processedAt: {
      type: Date,
      default: null,
      index: true,
    },
    skippedReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

wishlistDiscountEventSchema.index({ user: 1, processedAt: 1 });
wishlistDiscountEventSchema.index({ product: 1, processedAt: 1 });

module.exports =
  mongoose.models.WishlistDiscountEvent ||
  mongoose.model("WishlistDiscountEvent", wishlistDiscountEventSchema);
