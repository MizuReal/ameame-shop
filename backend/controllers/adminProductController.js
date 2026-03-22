const mongoose = require("mongoose");

const Product = require("../models/Product");
const Category = require("../models/Category");
const { cloudinary } = require("../config/cloudinary");
const { sendError } = require("../utils/errorResponse");
const { getPaginationParams } = require("../utils/pagination");
const {
  computeDiscountedPrice,
  computeDiscountPercent,
  isDiscountActive,
  normalizeDiscountType,
} = require("../utils/discountUtils");

const SIGNIFICANT_DISCOUNT_PERCENT = Number(
  process.env.WISHLIST_DISCOUNT_SIGNIFICANT_PERCENT || 10
);

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
    id: product.id,
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
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function parseNumber(value, fieldName, { min = 0 } = {}) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < min) {
    const error = new Error(`${fieldName} must be a valid number greater than or equal to ${min}.`);
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  return parsed;
}

function parseOptionalDate(value, fieldName, { boundary = "start" } = {}) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  const raw = String(value).trim();
  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const parsed = dateOnlyMatch
    ? new Date(`${raw}T${boundary === "end" ? "23:59:59.999" : "00:00:00.000"}`)
    : new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error(`${fieldName} must be a valid date.`);
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }
  return parsed;
}

function parseOptionalBoolean(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const lowered = value.toLowerCase();
    if (lowered === "true" || lowered === "1") return true;
    if (lowered === "false" || lowered === "0") return false;
  }

  return null;
}

function toUploadedImage(file) {
  if (!file) {
    return null;
  }

  const normalized = {
    url: file.path || file.secure_url || "",
    public_id: file.filename || file.public_id || "",
  };

  if (!normalized.url || !normalized.public_id) {
    return null;
  }

  return normalized;
}

function toUploadedImages(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  return files
    .map((file) => toUploadedImage(file))
    .filter((entry) => entry?.url && entry?.public_id);
}

function getProductImagePublicIds(product) {
  const ids = new Set();

  if (product?.image?.public_id) {
    ids.add(product.image.public_id);
  }

  if (Array.isArray(product?.images)) {
    product.images.forEach((entry) => {
      if (entry?.public_id) {
        ids.add(entry.public_id);
      }
    });
  }

  return Array.from(ids);
}

function getNormalizedProductImages(product) {
  const imageByKey = new Map();
  const register = (entry) => {
    if (!entry?.url || !entry?.public_id) {
      return;
    }
    const key = `${entry.public_id}::${entry.url}`;
    if (!imageByKey.has(key)) {
      imageByKey.set(key, {
        url: entry.url,
        public_id: entry.public_id,
      });
    }
  };

  register(product?.image);
  if (Array.isArray(product?.images)) {
    product.images.forEach(register);
  }

  return Array.from(imageByKey.values());
}

function parseRetainImagePublicIds(value) {
  if (value === undefined) {
    return undefined;
  }

  let list = [];
  if (Array.isArray(value)) {
    list = value;
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      list = [];
    } else {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          list = parsed;
        } else {
          list = trimmed.split(",");
        }
      } catch (_error) {
        list = trimmed.split(",");
      }
    }
  } else {
    const error = new Error("retainImagePublicIds must be an array or JSON string array.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  return list
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

async function ensureCategoryExists(categoryName) {
  const category = await Category.findOne({
    name: categoryName,
    isActive: true,
  }).lean();

  if (!category) {
    const error = new Error("Selected category does not exist or is inactive.");
    error.statusCode = 400;
    error.code = "INVALID_CATEGORY";
    throw error;
  }
}

function parseSortParams(query = {}) {
  const allowedSorts = new Set([
    "createdAt",
    "price",
    "name",
    "stock",
    "ratingAverage",
    "ratingCount",
  ]);

  const sortKey = typeof query.sort === "string" && query.sort.trim() ? query.sort.trim() : "createdAt";
  if (!allowedSorts.has(sortKey)) {
    const error = new Error(
      `sort must be one of: ${Array.from(allowedSorts).join(", ")}.`
    );
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  let order = -1;
  if (query.order !== undefined) {
    const normalized = String(query.order).toLowerCase();
    if (normalized === "asc" || normalized === "1") {
      order = 1;
    } else if (normalized === "desc" || normalized === "-1") {
      order = -1;
    } else {
      const error = new Error("order must be 'asc' or 'desc'.");
      error.statusCode = 400;
      error.code = "VALIDATION_ERROR";
      throw error;
    }
  }

  return { sortKey, order };
}

function parseOptionalFilterBoolean(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;

  const error = new Error(`${fieldName} must be a boolean.`);
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  throw error;
}

async function listProducts(req, res, next) {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { sortKey, order } = parseSortParams(req.query);
    const categoryFilter =
      typeof req.query.category === "string" && req.query.category.trim()
        ? req.query.category.trim()
        : undefined;
    const inStock = parseOptionalFilterBoolean(req.query.inStock, "inStock");

    const filter = {};
    if (categoryFilter) {
      filter.category = categoryFilter;
    }
    if (inStock === true) {
      filter.stock = { $gt: 0 };
    } else if (inStock === false) {
      filter.stock = { $lte: 0 };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ [sortKey]: order })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      products: products.map((product) => ({
        ...product,
        id: String(product._id),
      })),
      page,
      limit,
      total,
    });
  } catch (error) {
    return next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const { name, description = "", category } = req.body;

    if (!name?.trim() || !category?.trim()) {
      return sendError(res, 400, "VALIDATION_ERROR", "name and category are required.");
    }

    const price = parseNumber(req.body.price, "price", { min: 0 });
    const stock = parseNumber(req.body.stock ?? 0, "stock", { min: 0 });
    await ensureCategoryExists(category.trim());
    const uploadedImages = toUploadedImages(req.files);

    if (uploadedImages.length === 0) {
      return sendError(res, 400, "VALIDATION_ERROR", "At least one product image is required.");
    }

    const discountType = normalizeDiscountType(req.body.discountType);
    const discountValue =
      req.body.discountValue !== undefined ? parseNumber(req.body.discountValue, "discountValue") : 0;
    const discountStartAt = parseOptionalDate(req.body.discountStartAt, "discountStartAt", {
      boundary: "start",
    });
    const discountEndAt = parseOptionalDate(req.body.discountEndAt, "discountEndAt", {
      boundary: "end",
    });

    if (discountValue > 0 && !discountType) {
      return sendError(res, 400, "VALIDATION_ERROR", "discountType is required when discountValue > 0.");
    }

    if (discountStartAt && discountEndAt && discountStartAt > discountEndAt) {
      return sendError(res, 400, "VALIDATION_ERROR", "discountStartAt must be before discountEndAt.");
    }

    const discountActive = isDiscountActive({
      discountValue,
      discountStartAt,
      discountEndAt,
    });
    const discountedPrice = discountActive
      ? computeDiscountedPrice({ price, discountType, discountValue })
      : price;

    const product = await Product.create({
      name: name.trim(),
      description: String(description || "").trim(),
      category: category.trim(),
      price,
      stock,
      discountType,
      discountValue,
      discountStartAt,
      discountEndAt,
      discountedPrice,
      discountActive,
      discountUpdatedAt: discountActive ? new Date() : null,
      image: uploadedImages[0],
      images: uploadedImages,
      isActive: true,
    });

    return res.status(201).json({
      product: toProductDto(product),
    });
  } catch (error) {
    return next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return sendError(res, 400, "INVALID_PRODUCT_ID", "Invalid product id.");
    }

    const product = await Product.findById(productId);

    if (!product) {
      return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found.");
    }

    const { name, description, category } = req.body;
    const previousDiscountActive = product.discountActive === true;
    const previousDiscountPercent = computeDiscountPercent({
      price: product.price,
      discountType: product.discountType,
      discountValue: product.discountValue,
      discountedPrice: product.discountedPrice,
    });

    if (typeof name === "string") {
      const trimmed = name.trim();
      if (!trimmed) {
        return sendError(res, 400, "VALIDATION_ERROR", "name cannot be empty.");
      }
      product.name = trimmed;
    }

    if (typeof description === "string") {
      product.description = description.trim();
    }

    if (typeof category === "string") {
      const trimmedCategory = category.trim();
      if (!trimmedCategory) {
        return sendError(res, 400, "VALIDATION_ERROR", "category cannot be empty.");
      }
      await ensureCategoryExists(trimmedCategory);
      product.category = trimmedCategory;
    }

    if (req.body.price !== undefined) {
      product.price = parseNumber(req.body.price, "price", { min: 0 });
    }

    if (req.body.stock !== undefined) {
      product.stock = parseNumber(req.body.stock, "stock", { min: 0 });
    }

    if (req.body.discountType !== undefined) {
      const normalized = normalizeDiscountType(req.body.discountType);
      if (req.body.discountType && !normalized) {
        return sendError(res, 400, "VALIDATION_ERROR", "discountType must be percent or fixed.");
      }
      product.discountType = normalized;
    }

    if (req.body.discountValue !== undefined) {
      product.discountValue = parseNumber(req.body.discountValue, "discountValue", { min: 0 });
    }

    if (req.body.discountStartAt !== undefined) {
      product.discountStartAt = parseOptionalDate(req.body.discountStartAt, "discountStartAt", {
        boundary: "start",
      });
    }

    if (req.body.discountEndAt !== undefined) {
      product.discountEndAt = parseOptionalDate(req.body.discountEndAt, "discountEndAt", {
        boundary: "end",
      });
    }

    if (product.discountValue > 0 && !product.discountType) {
      return sendError(res, 400, "VALIDATION_ERROR", "discountType is required when discountValue > 0.");
    }

    if (
      product.discountStartAt &&
      product.discountEndAt &&
      product.discountStartAt > product.discountEndAt
    ) {
      return sendError(res, 400, "VALIDATION_ERROR", "discountStartAt must be before discountEndAt.");
    }

    const parsedIsActive = parseOptionalBoolean(req.body.isActive);
    if (parsedIsActive === null) {
      return sendError(res, 400, "VALIDATION_ERROR", "isActive must be a boolean.");
    }

    if (parsedIsActive !== undefined) {
      product.isActive = parsedIsActive;
    }

    const nextDiscountActive = isDiscountActive({
      discountValue: product.discountValue,
      discountStartAt: product.discountStartAt,
      discountEndAt: product.discountEndAt,
    });
    const nextDiscountedPrice = nextDiscountActive
      ? computeDiscountedPrice({
          price: product.price,
          discountType: product.discountType,
          discountValue: product.discountValue,
        })
      : product.price;
    const nextDiscountPercent = computeDiscountPercent({
      price: product.price,
      discountType: product.discountType,
      discountValue: product.discountValue,
      discountedPrice: nextDiscountedPrice,
    });

    const discountFieldsChanged =
      req.body.discountType !== undefined ||
      req.body.discountValue !== undefined ||
      req.body.discountStartAt !== undefined ||
      req.body.discountEndAt !== undefined ||
      req.body.price !== undefined;

    product.discountActive = nextDiscountActive;
    product.discountedPrice = nextDiscountedPrice;
    if (discountFieldsChanged) {
      product.discountUpdatedAt = new Date();
    }

    const currentImages = getNormalizedProductImages(product);
    const retainImagePublicIds = parseRetainImagePublicIds(req.body.retainImagePublicIds);
    const uploadedImages = toUploadedImages(req.files);
    const shouldUpdateImages = retainImagePublicIds !== undefined || uploadedImages.length > 0;

    if (shouldUpdateImages) {
      const retainSet = new Set(retainImagePublicIds || currentImages.map((entry) => entry.public_id));
      const retainedExistingImages = currentImages.filter((entry) => retainSet.has(entry.public_id));
      if (retainedExistingImages.length + uploadedImages.length > 5) {
        return sendError(res, 400, "VALIDATION_ERROR", "A product can have up to 5 images.");
      }
      const nextImages = [...retainedExistingImages, ...uploadedImages];

      if (nextImages.length === 0) {
        return sendError(res, 400, "VALIDATION_ERROR", "Product must have at least one image.");
      }

      const previousPublicIds = new Set(currentImages.map((entry) => entry.public_id));
      const nextPublicIds = new Set(nextImages.map((entry) => entry.public_id));
      const removedPublicIds = Array.from(previousPublicIds).filter((id) => !nextPublicIds.has(id));

      product.image = nextImages[0];
      product.images = nextImages;

      if (removedPublicIds.length > 0) {
        await Promise.all(
          removedPublicIds.map((publicId) => cloudinary.uploader.destroy(publicId).catch(() => null))
        );
      }
    }

    await product.save();

    const significantThreshold = Number.isFinite(SIGNIFICANT_DISCOUNT_PERCENT)
      ? SIGNIFICANT_DISCOUNT_PERCENT
      : 10;

    const shouldTriggerWishlistEvent =
      (previousDiscountActive === false && nextDiscountActive === true) ||
      (nextDiscountActive &&
        Math.abs(nextDiscountPercent - previousDiscountPercent) >= significantThreshold);

    if (shouldTriggerWishlistEvent) {
      const { enqueueWishlistDiscountEvents, processWishlistDiscountQueue } = require("../services/wishlistNotificationService");
      enqueueWishlistDiscountEvents(product)
        .then(() => processWishlistDiscountQueue())
        .catch(() => null);
    }

    return res.status(200).json({
      product: toProductDto(product),
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return sendError(res, 400, "INVALID_PRODUCT_ID", "Invalid product id.");
    }

    const product = await Product.findById(productId);

    if (!product) {
      return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found.");
    }

    const previousPublicIds = getProductImagePublicIds(product);
    await product.deleteOne();

    if (previousPublicIds.length > 0) {
      await Promise.all(
        previousPublicIds.map((publicId) => cloudinary.uploader.destroy(publicId).catch(() => null))
      );
    }

    return res.status(200).json({
      message: "Product deleted.",
    });
  } catch (error) {
    return next(error);
  }
}

async function batchUpdateDiscounts(req, res, next) {
  try {
    const { productIds, discountType, discountValue, discountStartAt, discountEndAt } = req.body || {};

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return sendError(res, 400, "VALIDATION_ERROR", "productIds must be a non-empty array.");
    }

    const normalizedIds = productIds
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object") {
          return entry.id || entry._id || "";
        }
        return "";
      })
      .filter(Boolean);

    const ids = normalizedIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (ids.length !== normalizedIds.length) {
      return sendError(res, 400, "INVALID_PRODUCT_ID", "One or more product ids are invalid.");
    }

    const normalizedType = discountType === "" ? null : normalizeDiscountType(discountType);
    if (discountType && !normalizedType) {
      return sendError(res, 400, "VALIDATION_ERROR", "discountType must be percent or fixed.");
    }

    const parsedDiscountValue = parseNumber(discountValue ?? 0, "discountValue", { min: 0 });
    const parsedStartAt = parseOptionalDate(discountStartAt, "discountStartAt", {
      boundary: "start",
    });
    const parsedEndAt = parseOptionalDate(discountEndAt, "discountEndAt", {
      boundary: "end",
    });

    if (parsedDiscountValue > 0 && !normalizedType) {
      return sendError(res, 400, "VALIDATION_ERROR", "discountType is required when discountValue > 0.");
    }

    if (parsedStartAt && parsedEndAt && parsedStartAt > parsedEndAt) {
      return sendError(res, 400, "VALIDATION_ERROR", "discountStartAt must be before discountEndAt.");
    }

    const products = await Product.find({ _id: { $in: ids } });
    if (!products.length) {
      return sendError(res, 404, "PRODUCT_NOT_FOUND", "No products found.");
    }

    const now = new Date();
    const updates = [];
    const triggers = [];

    products.forEach((product) => {
      const previousDiscountActive = product.discountActive === true;
      const previousDiscountPercent = computeDiscountPercent({
        price: product.price,
        discountType: product.discountType,
        discountValue: product.discountValue,
        discountedPrice: product.discountedPrice,
      });

      const nextDiscountActive = isDiscountActive({
        discountValue: parsedDiscountValue,
        discountStartAt: parsedStartAt,
        discountEndAt: parsedEndAt,
      });

      const nextDiscountedPrice = nextDiscountActive
        ? computeDiscountedPrice({
            price: product.price,
            discountType: normalizedType,
            discountValue: parsedDiscountValue,
          })
        : product.price;

      const nextDiscountPercent = computeDiscountPercent({
        price: product.price,
        discountType: normalizedType,
        discountValue: parsedDiscountValue,
        discountedPrice: nextDiscountedPrice,
      });

      const significantThreshold = Number.isFinite(SIGNIFICANT_DISCOUNT_PERCENT)
        ? SIGNIFICANT_DISCOUNT_PERCENT
        : 10;

      const shouldTrigger =
        (previousDiscountActive === false && nextDiscountActive === true) ||
        (nextDiscountActive &&
          Math.abs(nextDiscountPercent - previousDiscountPercent) >= significantThreshold);

      updates.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: {
              discountType: normalizedType,
              discountValue: parsedDiscountValue,
              discountStartAt: parsedStartAt,
              discountEndAt: parsedEndAt,
              discountedPrice: nextDiscountedPrice,
              discountActive: nextDiscountActive,
              discountUpdatedAt: now,
            },
          },
        },
      });

      if (shouldTrigger) {
        triggers.push({
          ...product.toObject(),
          discountType: normalizedType,
          discountValue: parsedDiscountValue,
          discountStartAt: parsedStartAt,
          discountEndAt: parsedEndAt,
          discountedPrice: nextDiscountedPrice,
          discountActive: nextDiscountActive,
        });
      }
    });

    if (updates.length) {
      await Product.bulkWrite(updates);
    }

    if (triggers.length) {
      const { enqueueWishlistDiscountEvents, processWishlistDiscountQueue } = require("../services/wishlistNotificationService");
      await Promise.all(triggers.map((product) => enqueueWishlistDiscountEvents(product).catch(() => null)));
      // Process immediately so users get notified right away.
      processWishlistDiscountQueue().catch(() => null);
    }

    const updated = await Product.find({ _id: { $in: ids } }).lean();

    return res.status(200).json({
      products: updated.map((product) => toProductDto(product)),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  batchUpdateDiscounts,
};
