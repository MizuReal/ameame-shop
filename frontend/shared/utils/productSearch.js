import { API_BASE_URL } from "@utils/authSession";

const REQUEST_TIMEOUT_MS = 12000;

function buildSearchParams({ query, filters = {}, page = 1, limit }) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  if (filters.sort) {
    params.set("sort", filters.sort);
  }

  if (filters.minPrice != null) {
    params.set("minPrice", String(filters.minPrice));
  }

  if (filters.maxPrice != null) {
    params.set("maxPrice", String(filters.maxPrice));
  }

  if (filters.minDiscountPercent != null) {
    params.set("minDiscountPercent", String(filters.minDiscountPercent));
  }

  if (Array.isArray(filters.categories)) {
    filters.categories.forEach((category) => {
      if (category) {
        params.append("category", category);
      }
    });
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  if (limit) {
    params.set("limit", String(limit));
  }

  return params.toString();
}

function normalizeResponse(payload = {}) {
  if (payload?.data?.products) {
    return {
      products: payload.data.products,
      pagination: payload.data.pagination,
    };
  }

  return {
    products: payload.products ?? [],
    pagination: {
      total: payload.total ?? 0,
      page: payload.page ?? 1,
      limit: payload.limit ?? 20,
      totalPages: payload.totalPages ?? 1,
    },
  };
}

export async function searchProducts({ query = "", filters = {}, page = 1, limit } = {}) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const params = buildSearchParams({ query, filters, page, limit });
    const response = await fetch(`${API_BASE_URL}/v1/products?${params}`, {
      method: "GET",
      signal: abortController.signal,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof payload?.error?.message === "string"
          ? payload.error.message
          : "Search failed.";
      throw new Error(message);
    }

    return normalizeResponse(payload);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Search timed out after ${REQUEST_TIMEOUT_MS}ms.`);
    }

    if (error instanceof TypeError) {
      throw new Error(`Cannot reach backend at ${API_BASE_URL}.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getProductById(productId) {
  if (!productId) {
    throw new Error("Product id is required.");
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/v1/products/${productId}`, {
      method: "GET",
      signal: abortController.signal,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof payload?.error?.message === "string"
          ? payload.error.message
          : "Failed to load product.";
      throw new Error(message);
    }

    if (!payload?.product) {
      throw new Error("Product not found.");
    }

    return payload.product;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Product request timed out after ${REQUEST_TIMEOUT_MS}ms.`);
    }

    if (error instanceof TypeError) {
      throw new Error(`Cannot reach backend at ${API_BASE_URL}.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchDiscountOptions({ limit = 6 } = {}) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const params = new URLSearchParams();
    if (limit) {
      params.set("limit", String(limit));
    }
    const response = await fetch(`${API_BASE_URL}/v1/products/discounts?${params.toString()}`, {
      method: "GET",
      signal: abortController.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        typeof payload?.error?.message === "string"
          ? payload.error.message
          : "Failed to load discounts.";
      throw new Error(message);
    }

    return Array.isArray(payload.discounts) ? payload.discounts : [];
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Discounts request timed out after ${REQUEST_TIMEOUT_MS}ms.`);
    }

    if (error instanceof TypeError) {
      throw new Error(`Cannot reach backend at ${API_BASE_URL}.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
