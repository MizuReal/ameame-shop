function clampNumber(value, min = 0) {
  if (!Number.isFinite(value)) return min;
  return value < min ? min : value;
}

function normalizeDiscountType(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "percent" || trimmed === "fixed") {
    return trimmed;
  }
  return null;
}

function computeDiscountedPrice({ price, discountType, discountValue }) {
  const basePrice = clampNumber(Number(price || 0), 0);
  const value = clampNumber(Number(discountValue || 0), 0);
  const type = normalizeDiscountType(discountType);

  if (!type || value <= 0 || basePrice <= 0) {
    return basePrice;
  }

  if (type === "percent") {
    const pct = Math.min(value, 100);
    return clampNumber(basePrice * (1 - pct / 100), 0);
  }

  return clampNumber(basePrice - value, 0);
}

function computeDiscountPercent({ price, discountType, discountValue, discountedPrice }) {
  const basePrice = clampNumber(Number(price || 0), 0);
  if (!basePrice) {
    return 0;
  }

  const type = normalizeDiscountType(discountType);
  const value = clampNumber(Number(discountValue || 0), 0);

  if (type === "percent") {
    return clampNumber(Math.min(value, 100), 0);
  }

  if (type === "fixed") {
    return clampNumber((value / basePrice) * 100, 0);
  }

  if (Number.isFinite(discountedPrice)) {
    return clampNumber(((basePrice - discountedPrice) / basePrice) * 100, 0);
  }

  return 0;
}

function isDiscountActive({
  discountValue,
  discountStartAt,
  discountEndAt,
  now = new Date(),
}) {
  const value = clampNumber(Number(discountValue || 0), 0);
  if (value <= 0) return false;

  const start = discountStartAt ? new Date(discountStartAt) : null;
  const end = discountEndAt ? new Date(discountEndAt) : null;

  if (start && Number.isFinite(start.getTime()) && now < start) {
    return false;
  }
  if (end && Number.isFinite(end.getTime()) && now > end) {
    return false;
  }
  return true;
}

module.exports = {
  computeDiscountedPrice,
  computeDiscountPercent,
  isDiscountActive,
  normalizeDiscountType,
};
