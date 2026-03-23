import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth } from "../../modules/firebase/client";
import { clearSessionJwt, syncAuthSession } from "../../shared/utils/authSession";
import { showToast } from "../../shared/utils/toastBus";
import {
	setAccountProfile,
	setCurrentUser,
	setInitialized,
	mergeAccountProfile,
	setRoleBusy,
	setRoleError,
} from "../actions/auth.actions";
import authReducer, { initialAuthState } from "../reducers/auth.reducers";
import { AuthContext } from "./auth";

export default function AuthProvider({ children }) {
	const [state, dispatch] = useReducer(authReducer, initialAuthState);
	const requestCounterRef = useRef(0);

	const isDeactivatedAccountError = useCallback((error) => {
		if (!error) {
			return false;
		}

		if (error?.code === "ACCOUNT_DEACTIVATED") {
			return true;
		}

		const message = String(error?.message || "").toLowerCase();
		return message.includes("deactivated");
	}, []);

	const runRoleSync = useCallback(async (firebaseUser) => {
		if (!firebaseUser) {
			dispatch(setAccountProfile(null));
			dispatch(setRoleBusy(false));
			dispatch(setRoleError(""));
			return null;
		}

		const requestId = ++requestCounterRef.current;
		dispatch(setRoleBusy(true));
		dispatch(setRoleError(""));

		try {
			const profile = await syncAuthSession(firebaseUser);

			if (requestId === requestCounterRef.current) {
				dispatch(setAccountProfile(profile));
			}

			return profile;
		} catch (error) {
			if (isDeactivatedAccountError(error)) {
				if (requestId === requestCounterRef.current) {
					dispatch(setAccountProfile(null));
					dispatch(setRoleError(""));
				}

				showToast("Your account has been deactivated. Please contact an administrator.", "error");
				await clearSessionJwt().catch(() => null);
				await signOut(auth).catch(() => null);
				return null;
			}

			if (requestId === requestCounterRef.current) {
				dispatch(setAccountProfile(null));
				dispatch(setRoleError(error?.message || "Unable to load account role."));
			}

			return null;
		} finally {
			if (requestId === requestCounterRef.current) {
				dispatch(setRoleBusy(false));
			}
		}
	}, [isDeactivatedAccountError]);

	const refreshAccountProfile = useCallback(
		async (userOverride = null) => {
			const effectiveUser = userOverride ?? state.currentUser;
			return runRoleSync(effectiveUser);
		},
		[runRoleSync, state.currentUser]
	);

	const signOutUser = useCallback(async () => {
		dispatch(setCurrentUser(null));
		dispatch(setAccountProfile(null));
		dispatch(setRoleError(""));
		dispatch(setRoleBusy(false));
		await clearSessionJwt().catch(() => null);
		await signOut(auth).catch(() => null);
	}, []);

	useEffect(() => {
		let mounted = true;

		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (!mounted) {
				return;
			}

			dispatch(setCurrentUser(user ?? null));

			if (!user) {
				requestCounterRef.current += 1;
				await clearSessionJwt().catch(() => null);
				dispatch(setAccountProfile(null));
				dispatch(setRoleError(""));
				dispatch(setRoleBusy(false));
				dispatch(setInitialized(true));
				return;
			}

			await runRoleSync(user);

			if (mounted) {
				dispatch(setInitialized(true));
			}
		});

		return () => {
			mounted = false;
			requestCounterRef.current += 1;
			unsubscribe();
		};
	}, [runRoleSync]);

	const value = useMemo(
		() => ({
			...state,
			isAuthenticated: Boolean(state.currentUser),
			isAdmin: state.accountProfile?.role === 1,
			refreshAccountProfile,
			setAccountProfile: (profile) => dispatch(setAccountProfile(profile)),
			mergeAccountProfile: (patch) => dispatch(mergeAccountProfile(patch)),
			signOutUser,
		}),
		[refreshAccountProfile, signOutUser, state]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
