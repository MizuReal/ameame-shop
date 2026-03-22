import * as SQLite from "expo-sqlite";

import {
	CART_SET_ERROR,
	CART_SET_INITIALIZED,
	CART_SET_ITEMS,
	CART_SET_LOADING,
} from "../constant";

const DATABASE_NAME = "ameame-cart.db";
const CART_TABLE = "cart_items";

let databasePromise;

function getDatabase() {
	if (!databasePromise) {
		databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
	}

	return databasePromise;
}

async function initializeCartTable() {
	const db = await getDatabase();

	await db.execAsync(`
		CREATE TABLE IF NOT EXISTS ${CART_TABLE} (
			product_id TEXT PRIMARY KEY NOT NULL,
			name TEXT NOT NULL,
			price REAL NOT NULL,
			original_price REAL,
			discount_active INTEGER,
			discounted_price REAL,
			discount_percent REAL,
			image_uri TEXT,
			quantity INTEGER NOT NULL DEFAULT 1
		);
	`);

	// Best-effort schema upgrades for existing installs
	try { await db.execAsync(`ALTER TABLE ${CART_TABLE} ADD COLUMN original_price REAL;`); } catch {}
	try { await db.execAsync(`ALTER TABLE ${CART_TABLE} ADD COLUMN discount_active INTEGER;`); } catch {}
	try { await db.execAsync(`ALTER TABLE ${CART_TABLE} ADD COLUMN discounted_price REAL;`); } catch {}
	try { await db.execAsync(`ALTER TABLE ${CART_TABLE} ADD COLUMN discount_percent REAL;`); } catch {}
}

function mapRowToCartItem(row) {
	return {
		id: row.product_id,
		productId: row.product_id,
		name: row.name,
		price: Number(row.price || 0),
		originalPrice: Number(row.original_price || row.price || 0),
		discountActive: Boolean(row.discount_active),
		discountedPrice: Number(row.discounted_price || 0),
		discountPercent: Number(row.discount_percent || 0),
		imageUri: row.image_uri || null,
		quantity: Number(row.quantity || 0),
	};
}

async function getCartItemsFromDb() {
	await initializeCartTable();
	const db = await getDatabase();
	const rows = await db.getAllAsync(
		`SELECT product_id, name, price, original_price, discount_active, discounted_price, discount_percent, image_uri, quantity FROM ${CART_TABLE} ORDER BY rowid DESC;`
	);

	return rows.map(mapRowToCartItem);
}

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
	const items = await getCartItemsFromDb();
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
			// Fallback to an empty cart when SQLite is unavailable so the app can still proceed.
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
			await initializeCartTable();

			const db = await getDatabase();
			await db.runAsync(
				`
					INSERT INTO ${CART_TABLE} (product_id, name, price, original_price, discount_active, discounted_price, discount_percent, image_uri, quantity)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(product_id)
					DO UPDATE SET
						name = excluded.name,
						price = excluded.price,
						original_price = excluded.original_price,
						discount_active = excluded.discount_active,
						discounted_price = excluded.discounted_price,
						discount_percent = excluded.discount_percent,
						image_uri = excluded.image_uri,
						quantity = ${CART_TABLE}.quantity + excluded.quantity;
				`,
				[
					normalized.productId,
					normalized.name,
					normalized.price,
					normalized.originalPrice,
					normalized.discountActive ? 1 : 0,
					normalized.discountedPrice,
					normalized.discountPercent,
					normalized.imageUri,
					safeQuantity,
				]
			);

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
			await initializeCartTable();
			const db = await getDatabase();

			if (safeQuantity <= 0) {
				await db.runAsync(`DELETE FROM ${CART_TABLE} WHERE product_id = ?;`, [safeProductId]);
			} else {
				await db.runAsync(
					`UPDATE ${CART_TABLE} SET quantity = ? WHERE product_id = ?;`,
					[Math.floor(safeQuantity), safeProductId]
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
			await initializeCartTable();
			const db = await getDatabase();
			await db.runAsync(`DELETE FROM ${CART_TABLE};`);
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

