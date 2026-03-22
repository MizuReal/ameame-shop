const mongoose = require("mongoose");

const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const { sendError } = require("../utils/errorResponse");
const { createOrUpdateUserFromFirebase } = require("../utils/userSync");
const {
  computeDiscountPercent,
  computeDiscountedPrice,
  isDiscountActive,
} = require("../utils/discountUtils");

function toProductDto(product) {
  const normalizedImages = Array.isArray(product.images)
    ? product.images.filter((entry) => entry?.url && entry?.public_id)
    : [];
  const primaryImage =
    (product.image?.url && product.image?.public_id ? product.image : null)
    || normalizedImages[0]
    || { url: "", public_id: "" };

  const effectiveDiscountActive = isDiscountActive({
    discountValue: product.discountValue,
    discountStartAt: product.discountStartAt,
    discountEndAt: product.discountEndAt,
  });
  const effectiveDiscountedPrice = effectiveDiscountActive
    ? computeDiscountedPrice({
        price: product.price,
        discountType: product.discountType,
        discountValue: product.discountValue,
      })
    : product.price;

  const discountPercent = computeDiscountPercent({
    price: product.price,
    discountType: product.discountType,
    discountValue: product.discountValue,
    discountedPrice: effectiveDiscountedPrice,
  });

  return {
    id: String(product._id),
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    discountType: product.discountType,
    discountValue: product.discountValue,
    discountStartAt: product.discountStartAt,
    discountEndAt: product.discountEndAt,
    discountedPrice: effectiveDiscountedPrice,
    discountActive: effectiveDiscountActive,
    discountUpdatedAt: product.discountUpdatedAt,
    discountPercent,
    stock: product.stock,
    isActive: product.isActive,
    image: {
      url: primaryImage.url || "",
      public_id: primaryImage.public_id || "",
    },
    images: normalizedImages,
    ratingAverage: product.ratingAverage,
    ratingCount: product.ratingCount,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

async function listWishlist(req, res, next) {
  try {
    const user = await createOrUpdateUserFromFirebase(req.firebaseUser);
    if (user.isActive === false) {
      return sendError(res, 403, "ACCOUNT_DEACTIVATED", "Your account is deactivated.");
    }

    const wishlists = await Wishlist.find({ user: user._id })
      .populate("product")
      .sort({ createdAt: -1 })
      .lean();

    const items = wishlists
      .map((entry) => {
        if (!entry.product) return null;
        return {
          id: String(entry._id),
          productId: String(entry.product._id),
          product: toProductDto(entry.product),
          createdAt: entry.createdAt,
          lastNotifiedDiscountAt: entry.lastNotifiedDiscountAt,
          lastNotifiedDiscountPercent: entry.lastNotifiedDiscountPercent,
        };
      })
      .filter(Boolean);

    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
}

async function getWishlistStatus(req, res, next) {
  try {
    const user = await createOrUpdateUserFromFirebase(req.firebaseUser);
    if (user.isActive === false) {
      return sendError(res, 403, "ACCOUNT_DEACTIVATED", "Your account is deactivated.");
    }

    const { productId } = req.query;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return sendError(res, 400, "INVALID_PRODUCT_ID", "Invalid product id.");
    }

    const exists = await Wishlist.exists({
      user: user._id,
      product: productId,
    });

    return res.status(200).json({ isWishlisted: Boolean(exists) });
  } catch (error) {
    return next(error);
  }
}

async function addToWishlist(req, res, next) {
  try {
    const user = await createOrUpdateUserFromFirebase(req.firebaseUser);
    if (user.isActive === false) {
      return sendError(res, 403, "ACCOUNT_DEACTIVATED", "Your account is deactivated.");
    }

    const { productId } = req.body || {};
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return sendError(res, 400, "INVALID_PRODUCT_ID", "Invalid product id.");
    }

    const product = await Product.findOne({ _id: productId, isActive: true }).lean();
    if (!product) {
      return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found.");
    }

    const existing = await Wishlist.findOne({ user: user._id, product: productId }).lean();
    if (existing) {
      return res.status(200).json({
        item: {
          id: String(existing._id),
          productId: String(productId),
          product: toProductDto(product),
          createdAt: existing.createdAt,
          lastNotifiedDiscountAt: existing.lastNotifiedDiscountAt,
          lastNotifiedDiscountPercent: existing.lastNotifiedDiscountPercent,
        },
      });
    }

    const created = await Wishlist.create({
      user: user._id,
      product: productId,
    });

    return res.status(201).json({
      item: {
        id: String(created._id),
        productId: String(productId),
        product: toProductDto(product),
        createdAt: created.createdAt,
        lastNotifiedDiscountAt: created.lastNotifiedDiscountAt,
        lastNotifiedDiscountPercent: created.lastNotifiedDiscountPercent,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(200).json({ message: "Already wishlisted." });
    }
    return next(error);
  }
}

async function removeFromWishlist(req, res, next) {
  try {
    const user = await createOrUpdateUserFromFirebase(req.firebaseUser);
    if (user.isActive === false) {
      return sendError(res, 403, "ACCOUNT_DEACTIVATED", "Your account is deactivated.");
    }

    const { productId } = req.params;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return sendError(res, 400, "INVALID_PRODUCT_ID", "Invalid product id.");
    }

    await Wishlist.deleteOne({ user: user._id, product: productId });

    return res.status(200).json({ message: "Removed from wishlist." });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listWishlist,
  getWishlistStatus,
  addToWishlist,
  removeFromWishlist,
};
