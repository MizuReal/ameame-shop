import { API_BASE_URL } from "@utils/authSession";

const REQUEST_TIMEOUT_MS = 12000;

export async function fetchCategories() {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/v1/categories`, {
      method: "GET",
      signal: abortController.signal,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof payload?.error?.message === "string"
          ? payload.error.message
          : "Failed to load categories.";
      throw new Error(message);
    }

    return Array.isArray(payload?.categories) ? payload.categories : [];
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Category fetch timed out after ${REQUEST_TIMEOUT_MS}ms.`);
    }
    if (error instanceof TypeError) {
      throw new Error(`Cannot reach backend at ${API_BASE_URL}.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
