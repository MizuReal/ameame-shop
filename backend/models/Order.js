const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        name: String,
        price: Number,
        quantity: Number,
        image: String,
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
    },

    checkoutContact: {
      fullName: {
        type: String,
        trim: true,
        required: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        required: true,
      },
      contactNumber: {
        type: String,
        trim: true,
        required: true,
      },
      addressLine1: {
        type: String,
        trim: true,
        required: true,
      },
      city: {
        type: String,
        trim: true,
        required: true,
      },
      province: {
        type: String,
        trim: true,
        required: true,
      },
      postalCode: {
        type: String,
        trim: true,
        required: true,
      },
    },

    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery"],
      default: "cash_on_delivery",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "shipped", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);
