const mongoose = require("mongoose");
const Filter = require("bad-words");

const Review = require("../models/Review");
const Product = require("../models/Product");
const { findEligibleCompletedOrderId } = require("../services/reviewEligibilityService");
const { sendError } = require("../utils/errorResponse");
const { getPaginationParams } = require("../utils/pagination");
const { createOrUpdateUserFromFirebase } = require("../utils/userSync");

const profanityFilter = new Filter();
const MAX_REVIEW_COMMENT_LENGTH = 500;
const RATING_INPUT_REGEX = /^[1-5]$/;
const REVIEW_CONTENT_REGEX = /[A-Za-z0-9]/;
const REPEATED_PUNCTUATION_REGEX = /^([!?.,])\1{5,}$/;

function toReviewDto(review) {
  const userId =
    typeof review.user === "object" && review.user?._id
      ? String(review.user._id)
      : String(review.user);
  const authorName =
    typeof review.user === "object"
      ? review.user.displayName || review.user.email || "Customer"
      : "Customer";

  return {
    id: String(review._id),
    user: userId,
    product: String(review.product),
    order: review.order ? String(review.order) : null,
    rating: review.rating,
    comment: review.comment,
    authorName,
    isActive: review.isActive !== false,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

function parseRating(value) {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!RATING_INPUT_REGEX.test(normalized)) {
      const error = new Error("Rating is required and must be a whole number between 1 and 5.");
      error.statusCode = 400;
      error.code = "VALIDATION_ERROR";
      throw error;
    }

    return Number(normalized);
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    const error = new Error("Rating is required and must be a whole number between 1 and 5.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }
  return parsed;
}

function parseComment(value) {
  if (typeof value !== "string") {
    const error = new Error("Please write a review before submitting.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    const error = new Error("Please write a review before submitting.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  if (!REVIEW_CONTENT_REGEX.test(trimmed) || REPEATED_PUNCTUATION_REGEX.test(trimmed)) {
    const error = new Error(
      "Please provide a meaningful review with letters or numbers."
    );
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  if (trimmed.length > MAX_REVIEW_COMMENT_LENGTH) {
    const error = new Error(
      `Review must be ${MAX_REVIEW_COMMENT_LENGTH} characters or fewer.`
    );
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  if (trimmed && profanityFilter.isProfane(trimmed)) {
    const error = new Error(
      "Your review contains blocked language. Please remove inappropriate words and try again."
    );
    error.statusCode = 400;
    error.code = "PROFANITY_DETECTED";
    throw error;
  }

  return trimmed;
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

async function listProductReviews(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "INVALID_PRODUCT_ID", "Invalid product id.");
    }

    const product = await Product.findById(id).select("_id").lean();
    if (!product) {
      return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found.");
    }

    const { page, limit, skip } = getPaginationParams(req.query);
    const sort = typeof req.query.sort === "string" ? req.query.sort.trim() : "newest";
    const ratingFilter = Number(req.query.rating);
    const filter = { product: product._id, isActive: { $ne: false } };

    if (Number.isFinite(ratingFilter) && ratingFilter >= 1 && ratingFilter <= 5) {
      filter.rating = ratingFilter;
    }

    const sortMap = {
      newest: { createdAt: -1 },
      highest: { rating: -1, createdAt: -1 },
    };
    const sortQuery = sortMap[sort] || sortMap.newest;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .populate("user", "displayName email")
        .lean(),
      Review.countDocuments(filter),
    ]);

    return res.status(200).json({
      reviews: reviews.map((review) => toReviewDto(review)),
      page,
      limit,
      total,
    });
  } catch (error) {
    return next(error);
  }
}

async function createReview(req, res, next) {
  try {
    const user = await createOrUpdateUserFromFirebase(req.firebaseUser);
    if (user.isActive === false) {
      return sendError(
        res,
        403,
        "ACCOUNT_DEACTIVATED",
        "Your account is deactivated. Please contact an administrator."
      );
    }

    const productId = req.body.product || req.body.productId;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return sendError(res, 400, "INVALID_PRODUCT_ID", "Invalid product id.");
    }

    const product = await Product.findOne({ _id: productId, isActive: true }).lean();
    if (!product) {
      return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found.");
    }

    const eligibleOrderId = await findEligibleCompletedOrderId({
      userId: user._id,
      productId: product._id,
    });

    if (!eligibleOrderId) {
      return sendError(
        res,
        403,
        "REVIEW_NOT_ALLOWED",
        "You can only review products from delivered orders."
      );
    }

    const rating = parseRating(req.body.rating);
    const comment = parseComment(req.body.comment);

    const existingReview = await Review.findOne({
      user: user._id,
      product: product._id,
    });

    let review = null;

    if (existingReview) {
      if (existingReview.isActive) {
        return sendError(res, 409, "REVIEW_EXISTS", "You already reviewed this product.");
      }

      existingReview.rating = rating;
      existingReview.comment = comment;
      existingReview.order = eligibleOrderId;
      existingReview.isActive = true;
      review = await existingReview.save();
    } else {
      review = await Review.create({
        user: user._id,
        product: product._id,
        order: eligibleOrderId,
        rating,
        comment,
        isActive: true,
      });
    }

    await recalculateProductRatings(product._id);

    const hydrated = await Review.findById(review._id)
      .populate("user", "displayName email")
      .lean();

    return res.status(201).json({
      review: toReviewDto(hydrated || review),
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyReview(req, res, next) {
  try {
    const user = await createOrUpdateUserFromFirebase(req.firebaseUser);
    if (user.isActive === false) {
      return sendError(
        res,
        403,
        "ACCOUNT_DEACTIVATED",
        "Your account is deactivated. Please contact an administrator."
      );
    }

    const productId = typeof req.query.productId === "string" ? req.query.productId.trim() : "";
    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return sendError(res, 400, "INVALID_PRODUCT_ID", "Invalid product id.");
      }

      const review = await Review.findOne({ user: user._id, product: productId })
        .populate("user", "displayName email")
        .lean();

      if (!review) {
        return sendError(res, 404, "REVIEW_NOT_FOUND", "Review not found.");
      }

      return res.status(200).json({ review: toReviewDto(review) });
    }

    const reviews = await Review.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate("user", "displayName email")
      .lean();

    return res.status(200).json({
      reviews: reviews.map((review) => toReviewDto(review)),
      total: reviews.length,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateReview(req, res, next) {
  try {
    const user = await createOrUpdateUserFromFirebase(req.firebaseUser);
    if (user.isActive === false) {
      return sendError(
        res,
        403,
        "ACCOUNT_DEACTIVATED",
        "Your account is deactivated. Please contact an administrator."
      );
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "INVALID_REVIEW_ID", "Invalid review id.");
    }

    const review = await Review.findById(id);
    if (!review) {
      return sendError(res, 404, "REVIEW_NOT_FOUND", "Review not found.");
    }

    if (String(review.user) !== String(user._id)) {
      return sendError(res, 403, "REVIEW_FORBIDDEN", "You can only edit your own review.");
    }

    if (review.isActive === false) {
      return sendError(res, 404, "REVIEW_NOT_FOUND", "Review not found.");
    }

    const eligibleOrderId = await findEligibleCompletedOrderId({
      userId: user._id,
      productId: review.product,
    });

    if (!eligibleOrderId) {
      return sendError(
        res,
        403,
        "REVIEW_NOT_ALLOWED",
        "You can only review products from delivered orders."
      );
    }

    review.rating = parseRating(req.body.rating);
    review.comment = parseComment(req.body.comment);
    review.order = eligibleOrderId;
    await review.save();

    await recalculateProductRatings(review.product);

    const hydrated = await Review.findById(review._id)
      .populate("user", "displayName email")
      .lean();

    return res.status(200).json({ review: toReviewDto(hydrated) });
  } catch (error) {
    return next(error);
  }
}

async function deleteReview(req, res, next) {
  try {
    const user = await createOrUpdateUserFromFirebase(req.firebaseUser);
    if (user.isActive === false) {
      return sendError(
        res,
        403,
        "ACCOUNT_DEACTIVATED",
        "Your account is deactivated. Please contact an administrator."
      );
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "INVALID_REVIEW_ID", "Invalid review id.");
    }

    const review = await Review.findById(id);
    if (!review || review.isActive === false) {
      return sendError(res, 404, "REVIEW_NOT_FOUND", "Review not found.");
    }

    if (String(review.user) !== String(user._id)) {
      return sendError(res, 403, "REVIEW_FORBIDDEN", "You can only delete your own review.");
    }

    review.isActive = false;
    await review.save();

    await recalculateProductRatings(review.product);

    const hydrated = await Review.findById(review._id)
      .populate("user", "displayName email")
      .lean();

    return res.status(200).json({ review: toReviewDto(hydrated) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listProductReviews,
  createReview,
  getMyReview,
  updateReview,
  deleteReview,
};
