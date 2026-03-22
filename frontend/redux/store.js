import { configureStore } from "@reduxjs/toolkit";

import cartItems from "./reducers/cartItems";
import orders from "./slices/orderSlice";
import reviews from "./slices/reviewSlice";
import adminReviews from "./slices/adminReviewSlice";
import wishlist from "./slices/wishlistSlice";
import products from "./slices/productSlice";

export const store = configureStore({
		reducer: {
			cart: cartItems,
			products,
			orders,
			reviews,
			adminReviews,
			wishlist,
		},
	});

