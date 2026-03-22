function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function getPaginationParams(query = {}, { defaultPage = 1, defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = parsePositiveInt(query.page, defaultPage);
  const limit = Math.min(parsePositiveInt(query.limit, defaultLimit), maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

module.exports = {
  getPaginationParams,
};
