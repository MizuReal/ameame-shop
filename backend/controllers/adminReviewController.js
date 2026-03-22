const mongoose = require("mongoose");

const Review = require("../models/Review");
const Product = require("../models/Product");
const { sendError } = require("../utils/errorResponse");
const { getPaginationParams } = require("../utils/pagination");

function parseOptionalBoolean(value, fieldName) {
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

function parseArrayParam(value) {
  if (value === undefined) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseRatingArray(value) {
  const items = parseArrayParam(value);
  const ratings = items
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item >= 1 && item <= 5);
  return Array.from(new Set(ratings));
}

function parseSortParams(query = {}) {
  const sortKey = typeof query.sort === "string" ? query.sort.trim() : "createdAt";
  const allowed = new Set(["createdAt", "rating"]);
  if (!allowed.has(sortKey)) {
    const error = new Error("sort must be one of: createdAt, rating.");
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

function toAdminReviewDto(review) {
  return {
    id: String(review._id),
    product: review.product
      ? {
          id: String(review.product._id || review.product),
          name: review.product.name || "",
          category: review.product.category || "",
        }
      : null,
    user: review.user
      ? {
          id: String(review.user._id || review.user),
          displayName: review.user.displayName || "",
          email: review.user.email || "",
        }
      : null,
    rating: review.rating,
    comment: review.comment || "",
    isActive: review.isActive !== false,
    verified: Boolean(review.order),
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

async function recalculateProductRatings(productId) {
  const [stats] = await Review.aggregate([
    { $match: { product: productId, isActive: { $ne: false } } },
    {
      $group: {
        _id: "$product",
        ratingAverage: { $avg: "$rating" },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  await Product.updateOne(
    { _id: productId },
    {
      ratingAverage: stats ? stats.ratingAverage : 0,
      ratingCount: stats ? stats.ratingCount : 0,
    }
  );
}

async function listReviews(req, res, next) {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const productId = typeof req.query.productId === "string" ? req.query.productId.trim() : "";
    const categories = parseArrayParam(req.query.category);
    const ratings = parseRatingArray(req.query.rating);
    const isActive = parseOptionalBoolean(req.query.isActive, "isActive");
    const { sortKey, order } = parseSortParams(req.query);

    if (productId && !mongoose.Types.ObjectId.isValid(productId)) {
      return sendError(res, 400, "INVALID_PRODUCT_ID", "Invalid product id.");
    }

    const match = {};
    if (productId) {
      match.product = new mongoose.Types.ObjectId(productId);
    }
    if (ratings.length > 0) {
      match.rating = { $in: ratings };
    }
    if (isActive !== undefined) {
      match.isActive = isActive ? { $ne: false } : false;
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productDoc",
        },
      },
      { $unwind: { path: "$productDoc", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDoc",
        },
      },
      { $unwind: { path: "$userDoc", preserveNullAndEmptyArrays: true } },
    ];

    if (categories.length > 0) {
      pipeline.push({
        $match: {
          "productDoc.category": { $in: categories },
        },
      });
    }

    if (q) {
      const regex = new RegExp(q, "i");
      pipeline.push({
        $match: {
          $or: [
            { "productDoc.name": { $regex: regex } },
            { "userDoc.displayName": { $regex: regex } },
            { "userDoc.email": { $regex: regex } },
          ],
        },
      });
    }

    const sortQuery =
      sortKey === "createdAt"
        ? { createdAt: order }
        : { [sortKey]: order, createdAt: -1 };

    pipeline.push({ $sort: sortQuery });

    pipeline.push({
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    });

    const [result] = await Review.aggregate(pipeline);
    const reviews = (result?.data || []).map((doc) =>
      toAdminReviewDto({
        ...doc,
        product: doc.productDoc
          ? {
              _id: doc.productDoc._id,
              name: doc.productDoc.name,
              category: doc.productDoc.category,
            }
          : null,
        user: doc.userDoc
          ? {
              _id: doc.userDoc._id,
              displayName: doc.userDoc.displayName,
              email: doc.userDoc.email,
            }
          : null,
      })
    );
    const total = result?.total?.[0]?.count || 0;

    return res.status(200).json({
      reviews,
      page,
      limit,
      total,
    });
  } catch (error) {
    return next(error);
  }
}

async function getReview(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "INVALID_REVIEW_ID", "Invalid review id.");
    }

    const review = await Review.findById(id)
      .populate("product", "name category")
      .populate("user", "displayName email")
      .lean();

    if (!review) {
      return sendError(res, 404, "REVIEW_NOT_FOUND", "Review not found.");
    }

    return res.status(200).json({
      review: toAdminReviewDto(review),
    });
  } catch (error) {
    return next(error);
  }
}

async function updateReview(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "INVALID_REVIEW_ID", "Invalid review id.");
    }

    const review = await Review.findById(id);
    if (!review) {
      return sendError(res, 404, "REVIEW_NOT_FOUND", "Review not found.");
    }

    const nextIsActive = parseOptionalBoolean(req.body?.isActive, "isActive");
    if (nextIsActive === undefined) {
      return sendError(res, 400, "VALIDATION_ERROR", "isActive is required.");
    }

    review.isActive = nextIsActive;
    await review.save();

    await recalculateProductRatings(review.product);

    const hydrated = await Review.findById(review._id)
      .populate("product", "name category")
      .populate("user", "displayName email")
      .lean();

    return res.status(200).json({
      review: toAdminReviewDto(hydrated),
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteReview(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "INVALID_REVIEW_ID", "Invalid review id.");
    }

    const review = await Review.findById(id);
    if (!review) {
      return sendError(res, 404, "REVIEW_NOT_FOUND", "Review not found.");
    }

    const productId = review.product;
    await review.deleteOne();

    await recalculateProductRatings(productId);

    return res.status(200).json({
      message: "Review deleted.",
      reviewId: String(id),
      productId: String(productId),
    });
  } catch (error) {
    return next(error);
  }
}

async function listReviewSuggestions(req, res, next) {
  try {
    const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
    if (!query || query.length < 2) {
      return res.status(200).json({ products: [] });
    }

    const regex = new RegExp(query, "i");
    const products = await Product.find({ name: { $regex: regex }, isActive: true })
      .sort({ name: 1 })
      .limit(8)
      .select("name category")
      .lean();

    return res.status(200).json({
      products: products.map((product) => ({
        id: String(product._id),
        name: product.name,
        category: product.category,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listReviews,
  getReview,
  updateReview,
  deleteReview,
  listReviewSuggestions,
};
