const mongoose = require("mongoose");

const Category = require("../models/Category");
const Product = require("../models/Product");
const { sendError } = require("../utils/errorResponse");
const { getPaginationParams } = require("../utils/pagination");

const CATEGORY_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9 &'()-]{1,39}$/;

function normalizeCategoryName(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function toCategoryDto(category) {
  return {
    id: String(category._id),
    name: category.name,
    description: category.description || "",
    isActive: category.isActive !== false,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

function validateCategoryNameOrThrow(name) {
  const normalizedName = normalizeCategoryName(name);

  if (!normalizedName) {
    const error = new Error("Category name is required.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  if (!CATEGORY_NAME_REGEX.test(normalizedName)) {
    const error = new Error(
      "Category name must be 2-40 chars and can include letters, numbers, spaces, &, ', (, ), and -."
    );
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  return normalizedName;
}

function normalizeDescription(value) {
  return String(value || "").trim();
}

async function listCategories(req, res, next) {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const [categories, total] = await Promise.all([
      Category.find({})
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments({}),
    ]);

    return res.status(200).json({
      categories: categories.map((category) => toCategoryDto(category)),
      page,
      limit,
      total,
    });
  } catch (error) {
    return next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const name = validateCategoryNameOrThrow(req.body.name);
    const description = normalizeDescription(req.body.description);

    const category = await Category.create({
      name,
      normalizedKey: name.toLowerCase(),
      description,
      isActive: true,
    });

    return res.status(201).json({
      category: toCategoryDto(category),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(res, 409, "CATEGORY_EXISTS", "Category already exists.");
    }

    return next(error);
  }
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

async function updateCategory(req, res, next) {
  try {
    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return sendError(res, 400, "INVALID_CATEGORY_ID", "Invalid category id.");
    }

    const category = await Category.findById(categoryId);

    if (!category) {
      return sendError(res, 404, "CATEGORY_NOT_FOUND", "Category not found.");
    }

    let hasChanges = false;

    if (req.body.name !== undefined) {
      const nextName = validateCategoryNameOrThrow(req.body.name);
      category.name = nextName;
      category.normalizedKey = nextName.toLowerCase();
      hasChanges = true;
    }

    if (req.body.description !== undefined) {
      category.description = normalizeDescription(req.body.description);
      hasChanges = true;
    }

    const parsedIsActive = parseOptionalBoolean(req.body.isActive);
    if (parsedIsActive === null) {
      return sendError(res, 400, "VALIDATION_ERROR", "isActive must be a boolean.");
    }

    if (parsedIsActive !== undefined) {
      category.isActive = parsedIsActive;
      hasChanges = true;
    }

    if (!hasChanges) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "At least one field is required: name, description, or isActive."
      );
    }

    await category.save();

    return res.status(200).json({
      category: toCategoryDto(category),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(res, 409, "CATEGORY_EXISTS", "Category already exists.");
    }

    return next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return sendError(res, 400, "INVALID_CATEGORY_ID", "Invalid category id.");
    }

    const category = await Category.findById(categoryId);

    if (!category) {
      return sendError(res, 404, "CATEGORY_NOT_FOUND", "Category not found.");
    }

    const linkedProductsCount = await Product.countDocuments({
      category: category.name,
    });

    if (linkedProductsCount > 0) {
      return sendError(
        res,
        400,
        "CATEGORY_IN_USE",
        "Cannot delete category with existing products."
      );
    }

    await category.deleteOne();

    return res.status(200).json({
      message: "Category deleted.",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  CATEGORY_NAME_REGEX,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
