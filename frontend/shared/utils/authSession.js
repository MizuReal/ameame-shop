import * as SecureStore from "expo-secure-store";
import { registerForPushNotificationsAsync } from "@utils/notifications";

const REQUEST_TIMEOUT_MS = 12000;
const APP_JWT_STORAGE_KEY = "ameame.session.jwt";
const PUSH_DEBUG_ENABLED = process.env.EXPO_PUBLIC_DEBUG_PUSH_NOTIFICATIONS === "1";
const ADMIN_MUTATION_COOLDOWN_MS = 500;

const inFlightRequestMap = new Map();
const adminMutationCooldownMap = new Map();

function isAdminPath(path = "") {
  return typeof path === "string" && path.startsWith("/v1/admin/");
}

function normalizeMethod(method) {
  const normalized = String(method || "GET").trim().toUpperCase();
  return normalized || "GET";
}

function buildRequestSignature({ method, path, body, firebaseUid }) {
  const bodyPart =
    typeof FormData !== "undefined" && body instanceof FormData
      ? "[formdata]"
      : typeof body === "string"
        ? body
        : body === undefined || body === null
          ? ""
          : JSON.stringify(body);

  return `${firebaseUid || "anonymous"}::${method}::${path}::${bodyPart}`;
}

function logPushDebug(message, extra = undefined) {
  if (!PUSH_DEBUG_ENABLED) {
    return;
  }

  if (typeof extra === "undefined") {
    console.log(`[push-debug][frontend] ${message}`);
    return;
  }

  console.log(`[push-debug][frontend] ${message}`, extra);
}

function stripTrailingSlash(value) {
  return value.replace(/\/$/, "");
}
const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

if (!configuredBaseUrl) {
  throw new Error("EXPO_PUBLIC_API_BASE_URL is required in frontend/.env.");
}

const API_BASE_URL = stripTrailingSlash(configuredBaseUrl);

export async function saveSessionJwt(token) {
  if (!token) {
    await SecureStore.deleteItemAsync(APP_JWT_STORAGE_KEY).catch(() => null);
    return;
  }

  await SecureStore.setItemAsync(APP_JWT_STORAGE_KEY, String(token));
}

export async function getSessionJwt() {
  return SecureStore.getItemAsync(APP_JWT_STORAGE_KEY);
}

export async function clearSessionJwt() {
  await SecureStore.deleteItemAsync(APP_JWT_STORAGE_KEY).catch(() => null);
}

function buildRoleSyncHttpError(response, payload) {
  const backendMessage =
    typeof payload?.error?.message === "string"
      ? payload.error.message
      : typeof payload?.message === "string"
        ? payload.message
        : "";
  const statusLabel = `${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;

  if (response.status === 401) {
    return `Role sync failed (${statusLabel}): ${
      backendMessage || "Firebase session is invalid or expired."
    } Sign out and sign in again.`;
  }

  if (response.status === 403) {
    return `Role sync failed (${statusLabel}): ${
      backendMessage || "You are authenticated but not allowed to access this role endpoint."
    }`;
  }

  if (response.status === 404) {
    return `Role sync failed (${statusLabel}): ${
      backendMessage || "Session endpoint was not found."
    } Verify EXPO_PUBLIC_API_BASE_URL includes '/api' (example: http://<LAN-IP>:4000/api).`;
  }

  if (response.status >= 500) {
    return `Role sync failed (${statusLabel}): ${
      backendMessage || "Backend error while validating session."
    } Check backend logs and verify FIREBASE_WEB_API_KEY/MONGODB_URI are configured.`;
  }

  return `Role sync failed (${statusLabel}): ${
    backendMessage || "Backend rejected the session sync request."
  }`;
}

function createRoleSyncError(response, payload) {
  const error = new Error(buildRoleSyncHttpError(response, payload));
  error.status = response?.status;
  error.code = payload?.error?.code || "ROLE_SYNC_FAILED";
  return error;
}

async function postAuthSession(baseUrl, idToken, pushToken) {
  const abortController = new globalThis.AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    abortController.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`${baseUrl}/v1/auth/session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pushToken ? { pushToken } : {}),
      signal: abortController.signal,
    });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function syncAuthSession(firebaseUser) {
  const idToken = await firebaseUser.getIdToken();
  const pushToken = await registerForPushNotificationsAsync();
  logPushDebug("syncAuthSession push token", {
    hasToken: Boolean(pushToken),
    tokenPreview: pushToken ? `${pushToken.slice(0, 16)}...` : "",
  });
  let response;

  try {
    response = await postAuthSession(API_BASE_URL, idToken, pushToken);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        `Role sync timed out after ${REQUEST_TIMEOUT_MS}ms at ${API_BASE_URL}/v1/auth/session.`
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        `Cannot reach backend at ${API_BASE_URL}/v1/auth/session. Verify EXPO_PUBLIC_API_BASE_URL and ensure backend is running.`
      );
    }

    throw error;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createRoleSyncError(response, payload);
  }

  if (!payload?.user) {
    throw new Error("Role sync failed: backend response is missing `user` profile data.");
  }

  await saveSessionJwt(payload?.session?.token || null).catch(() => null);

  return payload.user;
}

function buildAdminHttpError(response, payload) {
  const backendMessage =
    typeof payload?.error?.message === "string"
      ? payload.error.message
      : typeof payload?.message === "string"
        ? payload.message
        : "";
  const statusLabel = `${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;

  if (response.status === 401) {
    return `Admin request failed (${statusLabel}): ${
      backendMessage || "Firebase session is invalid or expired."
    }`;
  }

  if (response.status === 403) {
    return `Admin request failed (${statusLabel}): ${
      backendMessage || "You do not have admin access."
    }`;
  }

  return `Admin request failed (${statusLabel}): ${
    backendMessage || "Backend rejected the request."
  }`;
}

async function requestWithFirebaseAuth(firebaseUser, path, init = {}) {
  if (!firebaseUser) {
    throw new Error("You must be signed in to perform this action.");
  }

  const appSessionJwt = await getSessionJwt();
  const idToken = await firebaseUser.getIdToken();
  const method = normalizeMethod(init?.method);
  const requestSignature = buildRequestSignature({
    method,
    path,
    body: init?.body,
    firebaseUid: firebaseUser?.uid,
  });
  const isAdminMutation = isAdminPath(path) && method !== "GET";

  const existingInFlight = inFlightRequestMap.get(requestSignature);
  if (existingInFlight) {
    const sharedResponse = await existingInFlight;
    return sharedResponse.clone();
  }

  if (isAdminMutation) {
    const now = Date.now();
    const lastMutationAt = Number(adminMutationCooldownMap.get(requestSignature) || 0);
    if (now - lastMutationAt < ADMIN_MUTATION_COOLDOWN_MS) {
      throw new Error("Action is already processing. Please wait a moment and try again.");
    }
    adminMutationCooldownMap.set(requestSignature, now);
  }

  const isFormDataBody =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const sharedRequest = (async () => {
    const abortController = new globalThis.AbortController();
    const timeoutId = globalThis.setTimeout(() => {
      abortController.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      return await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        method,
        headers: {
          Authorization: `Bearer ${appSessionJwt || idToken}`,
          "x-firebase-token": idToken,
          ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
          ...(init.headers || {}),
        },
        signal: abortController.signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms.`);
      }

      if (error instanceof TypeError) {
        throw new Error(`Cannot reach backend at ${API_BASE_URL}.`);
      }

      throw error;
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  })();

  inFlightRequestMap.set(requestSignature, sharedRequest);

  try {
    const response = await sharedRequest;
    return response.clone();
  } finally {
    inFlightRequestMap.delete(requestSignature);
  }
}

export async function requestWithSessionAuth(firebaseUser, path, init = {}) {
  return requestWithFirebaseAuth(firebaseUser, path, init);
}

function buildOrderHttpError(response, payload) {
  const backendMessage =
    typeof payload?.error?.message === "string"
      ? payload.error.message
      : typeof payload?.message === "string"
        ? payload.message
        : "";
  const statusLabel = `${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;

  if (response.status === 401) {
    return `Order request failed (${statusLabel}): ${
      backendMessage || "Your session is invalid or expired."
    }`;
  }

  if (response.status === 403) {
    return `Order request failed (${statusLabel}): ${
      backendMessage || "You are not allowed to perform this action."
    }`;
  }

  return `Order request failed (${statusLabel}): ${
    backendMessage || "Backend rejected the request."
  }`;
}

function buildReviewHttpError(response, payload) {
  const backendMessage =
    typeof payload?.error?.message === "string"
      ? payload.error.message
      : typeof payload?.message === "string"
        ? payload.message
        : "";
  const backendCode =
    typeof payload?.error?.code === "string" ? payload.error.code : "";
  const statusLabel = `${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;

  if (backendCode === "PROFANITY_DETECTED") {
    return backendMessage || "Bad words are not allowed in reviews.";
  }

  if (backendCode === "VALIDATION_ERROR" && backendMessage) {
    return backendMessage;
  }

  if (backendMessage) {
    return backendMessage;
  }

  if (response.status === 401) {
    return `Review request failed (${statusLabel}): ${
      "Your session is invalid or expired."
    }`;
  }

  if (response.status === 403) {
    return `Review request failed (${statusLabel}): ${
      "You are not allowed to perform this action."
    }`;
  }

  return `Review request failed (${statusLabel}): Backend rejected the request.`;
}

function buildWishlistHttpError(response, payload) {
  const backendMessage =
    typeof payload?.error?.message === "string"
      ? payload.error.message
      : typeof payload?.message === "string"
        ? payload.message
        : "";
  const statusLabel = `${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;

  if (response.status === 401) {
    return `Wishlist request failed (${statusLabel}): ${
      backendMessage || "Your session is invalid or expired."
    }`;
  }

  if (response.status === 403) {
    return `Wishlist request failed (${statusLabel}): ${
      backendMessage || "You are not allowed to perform this action."
    }`;
  }

  return `Wishlist request failed (${statusLabel}): ${
    backendMessage || "Backend rejected the request."
  }`;
}

export async function createOrderRequest(firebaseUser, payload) {
  const response = await requestWithFirebaseAuth(firebaseUser, "/v1/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildOrderHttpError(response, responsePayload));
  }

  if (!responsePayload?.order) {
    throw new Error("Invalid order response: created order is missing.");
  }

  return responsePayload.order;
}

export async function listProductReviewsRequest(
  productId,
  { page = 1, limit = 20, sort = "newest", rating } = {}
) {
  if (!productId) {
    throw new Error("Product id is required.");
  }

  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("limit", String(limit));
  if (sort) {
    query.set("sort", String(sort));
  }
  if (rating) {
    query.set("rating", String(rating));
  }

  const response = await fetch(
    `${API_BASE_URL}/v1/products/${productId}/reviews?${query.toString()}`,
    { method: "GET" }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : "Failed to load reviews.";
    throw new Error(message);
  }

  return {
    reviews: Array.isArray(payload?.reviews) ? payload.reviews : [],
    page: Number(payload?.page || page),
    limit: Number(payload?.limit || limit),
    total: Number(payload?.total || 0),
  };
}

export async function getMyReviewRequest(firebaseUser, productId) {
  if (!productId) {
    throw new Error("Product id is required.");
  }

  const response = await requestWithFirebaseAuth(
    firebaseUser,
    `/v1/reviews/me?productId=${encodeURIComponent(productId)}`,
    { method: "GET" }
  );

  const payload = await response.json().catch(() => ({}));

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(buildReviewHttpError(response, payload));
  }

  return payload?.review || null;
}

export async function listMyReviewsRequest(firebaseUser) {
  const response = await requestWithFirebaseAuth(firebaseUser, "/v1/reviews/me", {
    method: "GET",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildReviewHttpError(response, payload));
  }

  return Array.isArray(payload?.reviews) ? payload.reviews : [];
}

export async function createReviewRequest(firebaseUser, payload) {
  const response = await requestWithFirebaseAuth(firebaseUser, "/v1/reviews", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildReviewHttpError(response, responsePayload));
  }

  if (!responsePayload?.review) {
    throw new Error("Invalid review response: created review is missing.");
  }

  return responsePayload.review;
}

export async function updateReviewRequest(firebaseUser, reviewId, payload) {
  const response = await requestWithFirebaseAuth(firebaseUser, `/v1/reviews/${reviewId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildReviewHttpError(response, responsePayload));
  }

  if (!responsePayload?.review) {
    throw new Error("Invalid review response: updated review is missing.");
  }

  return responsePayload.review;
}

export async function deleteReviewRequest(firebaseUser, reviewId) {
  const response = await requestWithFirebaseAuth(firebaseUser, `/v1/reviews/${reviewId}`, {
    method: "DELETE",
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildReviewHttpError(response, responsePayload));
  }

  if (!responsePayload?.review) {
    throw new Error("Invalid review response: deleted review is missing.");
  }

  return responsePayload.review;
}

export async function listWishlistRequest(firebaseUser) {
  const response = await requestWithFirebaseAuth(firebaseUser, "/v1/wishlist", {
    method: "GET",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildWishlistHttpError(response, payload));
  }

  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
  };
}

export async function getWishlistStatusRequest(firebaseUser, productId) {
  if (!productId) {
    throw new Error("Product id is required.");
  }

  const response = await requestWithFirebaseAuth(
    firebaseUser,
    `/v1/wishlist/status?productId=${encodeURIComponent(productId)}`,
    { method: "GET" }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildWishlistHttpError(response, payload));
  }

  return {
    productId,
    isWishlisted: Boolean(payload?.isWishlisted),
  };
}

export async function addToWishlistRequest(firebaseUser, payload) {
  const response = await requestWithFirebaseAuth(firebaseUser, "/v1/wishlist", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildWishlistHttpError(response, responsePayload));
  }

  if (!responsePayload?.item) {
    throw new Error("Invalid wishlist response: item is missing.");
  }

  return responsePayload.item;
}

export async function removeFromWishlistRequest(firebaseUser, productId) {
  const response = await requestWithFirebaseAuth(
    firebaseUser,
    `/v1/wishlist/${productId}`,
    {
      method: "DELETE",
    }
  );

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildWishlistHttpError(response, responsePayload));
  }

  return responsePayload;
}

export async function listMyOrdersRequest(firebaseUser) {
  const response = await requestWithFirebaseAuth(firebaseUser, "/v1/orders", {
    method: "GET",
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildOrderHttpError(response, responsePayload));
  }

  return Array.isArray(responsePayload?.orders) ? responsePayload.orders : [];
}

export async function getMyOrdersCount(firebaseUser) {
  const response = await requestWithFirebaseAuth(firebaseUser, "/v1/orders?page=1&limit=1", {
    method: "GET",
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildOrderHttpError(response, responsePayload));
  }

  const total = Number(responsePayload?.total);
  if (Number.isFinite(total)) {
    return total;
  }

  return Array.isArray(responsePayload?.orders) ? responsePayload.orders.length : 0;
}

export async function getMyOrderRequest(firebaseUser, orderId) {
  const response = await requestWithFirebaseAuth(firebaseUser, `/v1/orders/${orderId}`, {
    method: "GET",
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildOrderHttpError(response, responsePayload));
  }

  if (!responsePayload?.order) {
    throw new Error("Invalid order response: order is missing.");
  }

  return responsePayload.order;
}

export async function adminListOrders(
  firebaseUser,
  { status = "", page = 1, limit = 20, includeMeta = false } = {}
) {
  const query = new URLSearchParams();
  if (status) {
    query.set("status", status);
  }
  query.set("page", String(page));
  query.set("limit", String(limit));

  const qs = query.toString();
  const response = await requestWithFirebaseAuth(
    firebaseUser,
    `/v1/admin/orders${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
    }
  );

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, responsePayload));
  }

  const orders = Array.isArray(responsePayload?.orders) ? responsePayload.orders : [];
  if (includeMeta) {
    return {
      orders,
      page: Number(responsePayload?.page || page),
      limit: Number(responsePayload?.limit || limit),
      total: Number(responsePayload?.total || orders.length),
    };
  }

  return orders;
}

export async function adminUpdateOrderStatus(firebaseUser, orderId, status) {
  const response = await requestWithFirebaseAuth(
    firebaseUser,
    `/v1/admin/orders/${orderId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, responsePayload));
  }

  if (!responsePayload?.order) {
    throw new Error("Invalid admin response: updated order is missing.");
  }

  return responsePayload.order;
}

export async function adminListUsers(firebaseUser) {
  const response = await requestWithFirebaseAuth(firebaseUser, "/v1/admin/users", {
    method: "GET",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, payload));
  }

  if (!Array.isArray(payload?.users)) {
    throw new Error("Invalid admin response: users list is missing.");
  }

  return payload.users;
}

export async function adminUpdateUser(firebaseUser, userId, updates) {
  const response = await requestWithFirebaseAuth(firebaseUser, `/v1/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, payload));
  }

  if (!payload?.user) {
    throw new Error("Invalid admin response: updated user is missing.");
  }

  return payload.user;
}

export async function adminListProducts(
  firebaseUser,
  { page = 1, limit = 20, includeMeta = false, sort = "createdAt", order = "desc" } = {}
) {
  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("limit", String(limit));
  query.set("sort", String(sort));
  query.set("order", String(order));

  const response = await requestWithFirebaseAuth(
    firebaseUser,
    `/v1/admin/products?${query.toString()}`,
    {
      method: "GET",
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, payload));
  }

  if (!Array.isArray(payload?.products)) {
    throw new Error("Invalid admin response: products list is missing.");
  }

  if (includeMeta) {
    return {
      products: payload.products,
      page: Number(payload?.page || page),
      limit: Number(payload?.limit || limit),
      total: Number(payload?.total || payload.products.length),
    };
  }

  return payload.products;
}

function appendProductPayload(formData, payload = {}) {
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
}

function appendProductImages(formData, imageAssets) {
  const normalized = Array.isArray(imageAssets)
    ? imageAssets
    : imageAssets && typeof imageAssets === "object"
      ? [imageAssets]
      : [];

  normalized.forEach((imageAsset, index) => {
    if (!imageAsset?.uri) {
      return;
    }

    formData.append("images", {
      uri: imageAsset.uri,
      name: imageAsset.name || `product-${Date.now()}-${index + 1}.jpg`,
      type: imageAsset.type || "image/jpeg",
    });
  });
}

export async function adminCreateProduct(firebaseUser, payload, imageAssets) {
  const formData = new FormData();
  appendProductPayload(formData, payload);
  appendProductImages(formData, imageAssets);

  const response = await requestWithFirebaseAuth(firebaseUser, "/v1/admin/products", {
    method: "POST",
    body: formData,
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, responsePayload));
  }

  if (!responsePayload?.product) {
    throw new Error("Invalid admin response: created product is missing.");
  }

  return responsePayload.product;
}

export async function adminUpdateProduct(firebaseUser, productId, payload, imageAssets) {
  const formData = new FormData();
  appendProductPayload(formData, payload);
  appendProductImages(formData, imageAssets);

  const response = await requestWithFirebaseAuth(firebaseUser, `/v1/admin/products/${productId}`, {
    method: "PATCH",
    body: formData,
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, responsePayload));
  }

  if (!responsePayload?.product) {
    throw new Error("Invalid admin response: updated product is missing.");
  }

  return responsePayload.product;
}

export async function adminBatchUpdateProductDiscounts(firebaseUser, payload) {
  const response = await requestWithFirebaseAuth(
    firebaseUser,
    "/v1/admin/products/discount-batch",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, responsePayload));
  }

  return Array.isArray(responsePayload?.products) ? responsePayload.products : [];
}

export async function adminDeleteProduct(firebaseUser, productId) {
  const response = await requestWithFirebaseAuth(firebaseUser, `/v1/admin/products/${productId}`, {
    method: "DELETE",
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, responsePayload));
  }

  return responsePayload;
}

export async function adminListCategories(
  firebaseUser,
  { page = 1, limit = 20, includeMeta = false } = {}
) {
  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("limit", String(limit));

  const response = await requestWithFirebaseAuth(
    firebaseUser,
    `/v1/admin/categories?${query.toString()}`,
    {
    method: "GET",
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, payload));
  }

  if (!Array.isArray(payload?.categories)) {
    throw new Error("Invalid admin response: categories list is missing.");
  }

  if (includeMeta) {
    return {
      categories: payload.categories,
      page: Number(payload?.page || page),
      limit: Number(payload?.limit || limit),
      total: Number(payload?.total || payload.categories.length),
    };
  }

  return payload.categories;
}

export async function adminListReviews(
  firebaseUser,
  {
    q = "",
    productId = "",
    categories = [],
    ratings = [],
    isActive,
    sort = "createdAt",
    order = "desc",
    page = 1,
    limit = 20,
  } = {}
) {
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (productId) query.set("productId", productId);
  if (Array.isArray(categories)) {
    categories.forEach((category) => {
      if (category) query.append("category", category);
    });
  }
  if (Array.isArray(ratings)) {
    ratings.forEach((rating) => {
      if (rating) query.append("rating", String(rating));
    });
  }
  if (isActive !== undefined && isActive !== null && isActive !== "") {
    query.set("isActive", String(isActive));
  }
  query.set("sort", sort);
  query.set("order", order);
  query.set("page", String(page));
  query.set("limit", String(limit));

  const response = await requestWithFirebaseAuth(
    firebaseUser,
    `/v1/admin/reviews?${query.toString()}`,
    { method: "GET" }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, payload));
  }

  return {
    reviews: Array.isArray(payload?.reviews) ? payload.reviews : [],
    page: Number(payload?.page || page),
    limit: Number(payload?.limit || limit),
    total: Number(payload?.total || 0),
  };
}

export async function adminGetReview(firebaseUser, reviewId) {
  const response = await requestWithFirebaseAuth(firebaseUser, `/v1/admin/reviews/${reviewId}`, {
    method: "GET",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, payload));
  }

  if (!payload?.review) {
    throw new Error("Invalid admin response: review is missing.");
  }

  return payload.review;
}

export async function adminUpdateReview(firebaseUser, reviewId, updates) {
  const response = await requestWithFirebaseAuth(firebaseUser, `/v1/admin/reviews/${reviewId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, payload));
  }

  if (!payload?.review) {
    throw new Error("Invalid admin response: updated review is missing.");
  }

  return payload.review;
}

export async function adminDeleteReview(firebaseUser, reviewId) {
  const response = await requestWithFirebaseAuth(firebaseUser, `/v1/admin/reviews/${reviewId}`, {
    method: "DELETE",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, payload));
  }

  return payload;
}

export async function adminReviewSuggestions(firebaseUser, query) {
  const response = await requestWithFirebaseAuth(
    firebaseUser,
    `/v1/admin/reviews/suggestions?query=${encodeURIComponent(query || "")}`,
    { method: "GET" }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, payload));
  }

  return Array.isArray(payload?.products) ? payload.products : [];
}

function buildProfileHttpError(response, payload) {
  const backendMessage =
    typeof payload?.error?.message === "string"
      ? payload.error.message
      : typeof payload?.message === "string"
        ? payload.message
        : "";
  const statusLabel = `${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;

  if (response.status === 401) {
    return `Profile update failed (${statusLabel}): ${
      backendMessage || "Your session is invalid or expired."
    }`;
  }

  if (response.status === 403) {
    return `Profile update failed (${statusLabel}): ${
      backendMessage || "You are not allowed to update this profile."
    }`;
  }

  return `Profile update failed (${statusLabel}): ${
    backendMessage || "Backend rejected the request."
  }`;
}

export async function updateMyProfile(firebaseUser, payload = {}, avatarAsset = null) {
  const isFormData = avatarAsset?.uri;
  const body = isFormData
    ? (() => {
        const formData = new FormData();
        if (payload?.displayName !== undefined) {
          formData.append("displayName", String(payload.displayName));
        }
        if (payload?.addressLine1 !== undefined) {
          formData.append("addressLine1", String(payload.addressLine1));
        }
        if (payload?.city !== undefined) {
          formData.append("city", String(payload.city));
        }
        if (payload?.province !== undefined) {
          formData.append("province", String(payload.province));
        }
        if (payload?.postalCode !== undefined) {
          formData.append("postalCode", String(payload.postalCode));
        }
        formData.append("avatar", {
          uri: avatarAsset.uri,
          name: avatarAsset.name || `avatar-${Date.now()}.jpg`,
          type: avatarAsset.type || "image/jpeg",
        });
        return formData;
      })()
    : JSON.stringify(payload);

  const response = await requestWithFirebaseAuth(firebaseUser, "/v1/users/me", {
    method: "PATCH",
    body,
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildProfileHttpError(response, responsePayload));
  }

  if (!responsePayload?.user) {
    throw new Error("Invalid profile response: updated user is missing.");
  }

  return responsePayload.user;
}

export async function adminCreateCategory(firebaseUser, payload) {
  const response = await requestWithFirebaseAuth(firebaseUser, "/v1/admin/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, responsePayload));
  }

  if (!responsePayload?.category) {
    throw new Error("Invalid admin response: created category is missing.");
  }

  return responsePayload.category;
}

export async function adminUpdateCategory(firebaseUser, categoryId, payload) {
  const response = await requestWithFirebaseAuth(firebaseUser, `/v1/admin/categories/${categoryId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, responsePayload));
  }

  if (!responsePayload?.category) {
    throw new Error("Invalid admin response: updated category is missing.");
  }

  return responsePayload.category;
}

export async function adminDeleteCategory(firebaseUser, categoryId) {
  const response = await requestWithFirebaseAuth(firebaseUser, `/v1/admin/categories/${categoryId}`, {
    method: "DELETE",
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(buildAdminHttpError(response, responsePayload));
  }

  return responsePayload;
}

export { API_BASE_URL };
