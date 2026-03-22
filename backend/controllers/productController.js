const mongoose = require("mongoose");

const Product = require("../models/Product");
const { sendError } = require("../utils/errorResponse");
const { getPaginationParams } = require("../utils/pagination");
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

function buildDiscountAggregation({ filter, sortQuery, skip, limit, minDiscountPercent }) {
  const now = new Date();
  const discountActiveExpr = {
    $and: [
      { $gt: ["$discountValue", 0] },
      {
        $or: [
          { $eq: ["$discountStartAt", null] },
          { $lte: ["$discountStartAt", now] },
        ],
      },
      {
        $or: [
          { $eq: ["$discountEndAt", null] },
          { $gte: ["$discountEndAt", now] },
        ],
      },
    ],
  };

  const discountedPriceExpr = {
    $cond: [
      "$_discountActive",
      {
        $cond: [
          { $eq: ["$discountType", "percent"] },
          {
            $subtract: [
              "$price",
              { $multiply: ["$price", { $divide: ["$discountValue", 100] }] },
            ],
          },
          { $subtract: ["$price", "$discountValue"] },
        ],
      },
      "$price",
    ],
  };

  const discountPercentExpr = {
    $cond: [
      "$_discountActive",
      {
        $cond: [
          { $gt: ["$price", 0] },
          {
            $multiply: [
              { $divide: [{ $subtract: ["$price", "$_discountedPrice"] }, "$price"] },
              100,
            ],
          },
          0,
        ],
      },
      0,
    ],
  };

  const basePipeline = [
    { $match: filter },
    { $addFields: { _discountActive: discountActiveExpr } },
    { $addFields: { _discountedPrice: discountedPriceExpr } },
    { $addFields: { _discountPercent: discountPercentExpr } },
    { $match: { _discountPercent: { $gte: Number(minDiscountPercent || 0) } } },
  ];

  const dataPipeline = [
    ...basePipeline,
    { $sort: sortQuery },
    { $skip: skip },
    { $limit: limit },
  ];

  const countPipeline = [
    ...basePipeline,
    { $count: "total" },
  ];

  return { dataPipeline, countPipeline };
}

async function listProducts(req, res, next) {
  try {
    const { q, category, minPrice, maxPrice, minDiscountPercent, sort } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query, {
      defaultPage: 1,
      defaultLimit: 20,
      maxLimit: 50,
    });
    const filter = { isActive: true };

    if (typeof q === "string" && q.trim()) {
      filter.$text = { $search: q.trim() };
    }

    if (category) {
      const categories = (Array.isArray(category) ? category : [category])
        .map((value) => String(value).trim())
        .filter(Boolean);
      if (categories.length > 0) {
        filter.category = { $in: categories };
      }
    }

    const hasMinPrice = minPrice !== undefined && minPrice !== "";
    const hasMaxPrice = maxPrice !== undefined && maxPrice !== "";
    if (hasMinPrice || hasMaxPrice) {
      filter.price = {};
      if (hasMinPrice) {
        filter.price.$gte = Number(minPrice);
      }
      if (hasMaxPrice) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    const sortMap = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      newest: { createdAt: -1 },
      rating: { ratingAverage: -1 },
    };
    const sortQuery = sortMap[sort] || sortMap.newest;

    const useDiscountFilter = minDiscountPercent !== undefined && minDiscountPercent !== "";

    let products = [];
    let total = 0;

    if (useDiscountFilter) {
      const { dataPipeline, countPipeline } = buildDiscountAggregation({
        filter,
        sortQuery,
        skip,
        limit,
        minDiscountPercent,
      });
      const [discountedProducts, countResult] = await Promise.all([
        Product.aggregate(dataPipeline),
        Product.aggregate(countPipeline),
      ]);
      products = discountedProducts || [];
      total = countResult?.[0]?.total || 0;
    } else {
      const [items, totalCount] = await Promise.all([
        Product.find(filter).sort(sortQuery).skip(skip).limit(limit).lean(),
        Product.countDocuments(filter),
      ]);
      products = items;
      total = totalCount;
    }

    return res.status(200).json({
      products: products.map((product) => toProductDto(product)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return next(error);
  }
}

async function listDiscountOptions(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 6), 1), 12);
    const now = new Date();
    const discountActiveExpr = {
      $and: [
        { $gt: ["$discountValue", 0] },
        {
          $or: [
            { $eq: ["$discountStartAt", null] },
            { $lte: ["$discountStartAt", now] },
          ],
        },
        {
          $or: [
            { $eq: ["$discountEndAt", null] },
            { $gte: ["$discountEndAt", now] },
          ],
        },
      ],
    };

    const discountedPriceExpr = {
      $cond: [
        "$_discountActive",
        {
          $cond: [
            { $eq: ["$discountType", "percent"] },
            {
              $subtract: [
                "$price",
                { $multiply: ["$price", { $divide: ["$discountValue", 100] }] },
              ],
            },
            { $subtract: ["$price", "$discountValue"] },
          ],
        },
        "$price",
      ],
    };

    const discountPercentExpr = {
      $cond: [
        "$_discountActive",
        {
          $cond: [
            { $gt: ["$price", 0] },
            {
              $multiply: [
                { $divide: [{ $subtract: ["$price", "$_discountedPrice"] }, "$price"] },
                100,
              ],
            },
            0,
          ],
        },
        0,
      ],
    };

    const pipeline = [
      { $match: { isActive: true } },
      { $addFields: { _discountActive: discountActiveExpr } },
      { $addFields: { _discountedPrice: discountedPriceExpr } },
      { $addFields: { _discountPercent: discountPercentExpr } },
      { $match: { _discountPercent: { $gt: 0 } } },
      { $project: { percent: { $round: ["$_discountPercent", 0] } } },
      { $group: { _id: "$percent" } },
      { $sort: { _id: -1 } },
      { $limit: limit },
    ];

    const results = await Product.aggregate(pipeline);
    const discounts = (results || [])
      .map((row) => Number(row._id))
      .filter((value) => Number.isFinite(value) && value > 0);

    return res.status(200).json({ discounts });
  } catch (error) {
    return next(error);
  }
}

async function getProduct(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "INVALID_PRODUCT_ID", "Invalid product id.");
    }

    const product = await Product.findOne({ _id: id, isActive: true }).lean();
    if (!product) {
      return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found.");
    }

    return res.status(200).json({
      product: toProductDto(product),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listProducts,
  getProduct,
  listDiscountOptions,
};
