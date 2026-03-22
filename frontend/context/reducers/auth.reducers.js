import {
	AUTH_RESET,
	AUTH_SET_ACCOUNT_PROFILE,
	AUTH_SET_CURRENT_USER,
	AUTH_SET_INITIALIZED,
	AUTH_SET_ROLE_BUSY,
	AUTH_SET_ROLE_ERROR,
} from "../actions/auth.actions";

export const initialAuthState = {
	currentUser: null,
	accountProfile: null,
	roleBusy: false,
	roleError: "",
	initialized: false,
};

export default function authReducer(state = initialAuthState, action) {
	switch (action.type) {
		case AUTH_SET_CURRENT_USER:
			return {
				...state,
				currentUser: action.payload ?? null,
			};
		case AUTH_SET_ACCOUNT_PROFILE:
			return {
				...state,
				accountProfile: action.payload ?? null,
			};
		case AUTH_SET_ROLE_BUSY:
			return {
				...state,
				roleBusy: Boolean(action.payload),
			};
		case AUTH_SET_ROLE_ERROR:
			return {
				...state,
				roleError: action.payload || "",
			};
		case AUTH_SET_INITIALIZED:
			return {
				...state,
				initialized: Boolean(action.payload),
			};
		case AUTH_RESET:
			return {
				...initialAuthState,
				initialized: true,
			};
		default:
			return state;
	}
}
