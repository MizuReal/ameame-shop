const Category = require("../models/Category");

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

async function listPublicCategories(_req, res, next) {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      categories: categories.map((category) => toCategoryDto(category)),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listPublicCategories,
};
