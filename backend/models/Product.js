const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: "text",
    },
    description: {
      type: String,
      default: "",
      trim: true,
      index: "text",
    },
    price: {
      type: Number,
      required: true,
      index: true,
    },
    discountType: {
      type: String,
      enum: ["percent", "fixed"],
      default: null,
    },
    discountValue: {
      type: Number,
      default: 0,
    },
    discountStartAt: {
      type: Date,
      default: null,
    },
    discountEndAt: {
      type: Date,
      default: null,
    },
    discountedPrice: {
      type: Number,
      default: 0,
    },
    discountActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    discountUpdatedAt: {
      type: Date,
      default: null,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    image: {
      url: String,
      public_id: String, // Cloudinary
    },
    images: [
      {
        url: String,
        public_id: String,
      },
    ],
    stock: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true, // soft delete
    },
    ratingAverage: {
      type: Number,
      default: 0,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// compound index for filters
productSchema.index({ category: 1, price: 1 });

module.exports =
  mongoose.models.Product || mongoose.model("Product", productSchema);
