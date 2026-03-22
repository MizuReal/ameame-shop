import {
	CART_SET_ERROR,
	CART_SET_INITIALIZED,
	CART_SET_ITEMS,
	CART_SET_LOADING,
} from "../constant";

const initialState = {
	items: [],
	loading: false,
	initialized: false,
	error: null,
};

export default function cartItems(state = initialState, action) {
	switch (action.type) {
		case CART_SET_ITEMS:
			return {
				...state,
				items: action.payload || [],
				error: null,
			};
		case CART_SET_LOADING:
			return {
				...state,
				loading: Boolean(action.payload),
			};
		case CART_SET_ERROR:
			return {
				...state,
				error:
					action.payload === null || typeof action.payload === "undefined"
						? null
						: action.payload || "Cart operation failed.",
			};
		case CART_SET_INITIALIZED:
			return {
				...state,
				initialized: Boolean(action.payload),
			};
		default:
			return state;
	}
}

