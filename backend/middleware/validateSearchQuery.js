const { sendError } = require("../utils/errorResponse");

function isMissing(value) {
  return value === undefined || value === null || value === "";
}

function validateSearchQuery(req, res, next) {
  const { minPrice, maxPrice, minDiscountPercent } = req.query;

  if (!isMissing(minPrice)) {
    const parsedMin = Number(minPrice);
    if (Number.isNaN(parsedMin)) {
      return sendError(res, 400, "VALIDATION_ERROR", "minPrice must be a number.");
    }
    if (parsedMin < 0) {
      return sendError(res, 400, "VALIDATION_ERROR", "minPrice must be a positive number.");
    }
  }

  if (!isMissing(maxPrice)) {
    const parsedMax = Number(maxPrice);
    if (Number.isNaN(parsedMax)) {
      return sendError(res, 400, "VALIDATION_ERROR", "maxPrice must be a number.");
    }
    if (parsedMax < 0) {
      return sendError(res, 400, "VALIDATION_ERROR", "maxPrice must be a positive number.");
    }
  }

  if (!isMissing(minPrice) && !isMissing(maxPrice)) {
    if (Number(minPrice) > Number(maxPrice)) {
      return sendError(res, 400, "VALIDATION_ERROR", "minPrice cannot exceed maxPrice.");
    }
  }

  if (!isMissing(minDiscountPercent)) {
    const parsedMinDiscount = Number(minDiscountPercent);
    if (Number.isNaN(parsedMinDiscount)) {
      return sendError(res, 400, "VALIDATION_ERROR", "minDiscountPercent must be a number.");
    }
    if (parsedMinDiscount < 0) {
      return sendError(res, 400, "VALIDATION_ERROR", "minDiscountPercent must be a positive number.");
    }
  }

  return next();
}

module.exports = {
  validateSearchQuery,
};
