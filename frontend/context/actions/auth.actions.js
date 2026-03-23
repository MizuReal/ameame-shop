export const AUTH_SET_CURRENT_USER = "AUTH_SET_CURRENT_USER";
export const AUTH_SET_ACCOUNT_PROFILE = "AUTH_SET_ACCOUNT_PROFILE";
export const AUTH_MERGE_ACCOUNT_PROFILE = "AUTH_MERGE_ACCOUNT_PROFILE";
export const AUTH_SET_ROLE_BUSY = "AUTH_SET_ROLE_BUSY";
export const AUTH_SET_ROLE_ERROR = "AUTH_SET_ROLE_ERROR";
export const AUTH_SET_INITIALIZED = "AUTH_SET_INITIALIZED";
export const AUTH_RESET = "AUTH_RESET";

export function setCurrentUser(user) {
	return {
		type: AUTH_SET_CURRENT_USER,
		payload: user,
	};
}

export function setAccountProfile(profile) {
	return {
		type: AUTH_SET_ACCOUNT_PROFILE,
		payload: profile,
	};
}

export function mergeAccountProfile(patch) {
	return {
		type: AUTH_MERGE_ACCOUNT_PROFILE,
		payload: patch ?? {},
	};
}

export function setRoleBusy(isBusy) {
	return {
		type: AUTH_SET_ROLE_BUSY,
		payload: Boolean(isBusy),
	};
}

export function setRoleError(message) {
	return {
		type: AUTH_SET_ROLE_ERROR,
		payload: message || "",
	};
}

export function setInitialized(isInitialized) {
	return {
		type: AUTH_SET_INITIALIZED,
		payload: Boolean(isInitialized),
	};
}

export function resetAuthState() {
	return {
		type: AUTH_RESET,
	};
}
