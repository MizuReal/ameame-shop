import {
	CART_SET_ERROR,
	CART_SET_INITIALIZED,
	CART_SET_ITEMS,
	CART_SET_LOADING,
} from "../constant";

let inMemoryCart = [];

function normalizeProduct(product) {
	const productId = product?.id || product?._id || product?.productId;

	if (!productId) {
		throw new Error("Product id is required.");
	}

	const originalPrice = Number(product?.price || 0);
	const discountedPrice = Number(product?.discountedPrice || 0);
	const discountActive = Boolean(product?.discountActive)
		&& discountedPrice > 0
		&& discountedPrice < originalPrice;
	const price = discountActive ? discountedPrice : originalPrice;

	return {
		productId: String(productId),
		name: product?.name || "Unnamed product",
		price,
		originalPrice,
		discountActive,
		discountedPrice: discountActive ? discountedPrice : 0,
		discountPercent: Number(product?.discountPercent || 0) || 0,
		imageUri: product?.image?.url || product?.imageUri || null,
	};
}

async function refreshCartState(dispatch) {
	const items = [...inMemoryCart];
	dispatch({ type: CART_SET_ITEMS, payload: items });
}

export function initializeCart() {
	return async (dispatch) => {
		dispatch({ type: CART_SET_LOADING, payload: true });

		try {
			await refreshCartState(dispatch);
			dispatch({ type: CART_SET_INITIALIZED, payload: true });
			dispatch({ type: CART_SET_ERROR, payload: null });
		} catch (error) {
			// Fallback to an empty cart so the app can still proceed.
			dispatch({ type: CART_SET_ITEMS, payload: [] });
			dispatch({ type: CART_SET_INITIALIZED, payload: true });
			dispatch({ type: CART_SET_ERROR, payload: error?.message || "Failed to load cart." });
		} finally {
			dispatch({ type: CART_SET_LOADING, payload: false });
		}
	};
}

export function addToCart(product, quantity = 1) {
	return async (dispatch) => {
		const safeQuantity = Math.max(1, Number(quantity || 1));

		try {
			const normalized = normalizeProduct(product);
			const existingIndex = inMemoryCart.findIndex(
				(item) => item.productId === normalized.productId
			);

			if (existingIndex >= 0) {
				const existing = inMemoryCart[existingIndex];
				inMemoryCart[existingIndex] = {
					...existing,
					...normalized,
					id: normalized.productId,
					quantity: Number(existing.quantity || 0) + safeQuantity,
				};
			} else {
				inMemoryCart.unshift({
					id: normalized.productId,
					productId: normalized.productId,
					name: normalized.name,
					price: normalized.price,
					originalPrice: normalized.originalPrice,
					discountActive: normalized.discountActive,
					discountedPrice: normalized.discountedPrice,
					discountPercent: normalized.discountPercent,
					imageUri: normalized.imageUri,
					quantity: safeQuantity,
				});
			}

			await refreshCartState(dispatch);
			dispatch({ type: CART_SET_ERROR, payload: null });
		} catch (error) {
			dispatch({ type: CART_SET_ERROR, payload: error?.message || "Failed to add item to cart." });
		}
	};
}

export function updateCartItemQuantity(productId, quantity) {
	return async (dispatch) => {
		const safeProductId = String(productId || "").trim();
		const safeQuantity = Number(quantity || 0);

		if (!safeProductId) {
			dispatch({ type: CART_SET_ERROR, payload: "Invalid cart item." });
			return;
		}

		try {
			if (safeQuantity <= 0) {
				inMemoryCart = inMemoryCart.filter((item) => item.productId !== safeProductId);
			} else {
				inMemoryCart = inMemoryCart.map((item) =>
					item.productId === safeProductId
						? { ...item, quantity: Math.floor(safeQuantity) }
						: item
				);
			}

			await refreshCartState(dispatch);
			dispatch({ type: CART_SET_ERROR, payload: null });
		} catch (error) {
			dispatch({ type: CART_SET_ERROR, payload: error?.message || "Failed to update cart item." });
		}
	};
}

export function removeFromCart(productId) {
	return updateCartItemQuantity(productId, 0);
}

export function clearCartAfterCheckout() {
	return async (dispatch) => {
		dispatch({ type: CART_SET_LOADING, payload: true });

		try {
			inMemoryCart = [];
			await refreshCartState(dispatch);
			dispatch({ type: CART_SET_ERROR, payload: null });
			return true;
		} catch (error) {
			const safeMessage = error?.message || "Failed to clear cart.";
			dispatch({ type: CART_SET_ERROR, payload: safeMessage });
			throw new Error(safeMessage);
		} finally {
			dispatch({ type: CART_SET_LOADING, payload: false });
		}
	};
}

