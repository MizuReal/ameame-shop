import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
let GoogleSigninModule = null;
let googleStatusCodes = null;
let googleSigninLoadError = null;

try {
	const mod = require("@react-native-google-signin/google-signin");
	GoogleSigninModule = mod.GoogleSignin;
	googleStatusCodes = mod.statusCodes;
} catch (error) {
	googleSigninLoadError = error;
}
import {
	GoogleAuthProvider,
	signInWithCredential,
	signInWithEmailAndPassword,
} from "firebase/auth";

import { auth } from "../../modules/firebase/client";
import { EnvelopeSimple, Eye, EyeSlash, SignIn } from "phosphor-react-native";
import { useColors } from "../../shared/colors/colorContext";
import { rgb } from "../../shared/styles/styleUtils";
import { makeTypeStyles } from "../../shared/typography/scale";
import Button from "../../shared/components/action/Button";
import TextInput from "../../shared/components/input/TextInput";
import GoogleIcon from "../../shared/components/display/GoogleIcon";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_REGEX = /^.{8,64}$/;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

function maskClientId(value) {
	if (!value) return "<missing>";
	if (value.length <= 12) return value;
	return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function mapFirebaseAuthError(code) {
	if (code === "auth/invalid-credential") return "Invalid email or password.";
	if (code === "auth/invalid-email") return "Please enter a valid email address.";
	if (code === "auth/user-disabled") return "This account is disabled.";
	if (code === "auth/account-exists-with-different-credential") {
		return "An account with this email already exists with another login method.";
	}
	if (code === "auth/network-request-failed") return "Network error. Check your connection and retry.";
	return "Unable to sign in right now. Please try again.";
}

function mapGoogleSignInError(error) {
	const code = String(error?.code || "");

	if (code === "10" || code === "DEVELOPER_ERROR") {
		return "Google Sign-In config mismatch (DEVELOPER_ERROR). Verify Android package name, SHA-1/SHA-256, and regenerated google-services.json.";
	}

	if (error?.code === googleStatusCodes?.SIGN_IN_CANCELLED) return "Google sign-in was cancelled.";
	if (error?.code === googleStatusCodes?.IN_PROGRESS) return "Google sign-in is already in progress.";
	if (error?.code === googleStatusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
		return "Google Play Services is unavailable or outdated on this device.";
	}
	if (error?.code === "ERR_CONFIG") {
		return "Google sign-in is not configured correctly. Check client IDs and app signing setup.";
	}
	return "Google sign-in failed. Please try again.";
}

export default function Login({ onSwitchToRegister, onSuccess }) {
	const tokens = useColors();
	const type = useMemo(() => makeTypeStyles(tokens), [tokens]);

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [fieldErrors, setFieldErrors] = useState({});
	const [submitError, setSubmitError] = useState("");
	const [busy, setBusy] = useState(false);
	const [googleBusy, setGoogleBusy] = useState(false);
	const [googleError, setGoogleError] = useState("");
	const [googleConfigured, setGoogleConfigured] = useState(false);

	useEffect(() => {
		if (!GoogleSigninModule) {
			setGoogleConfigured(false);
			const details = googleSigninLoadError ? " The native module isn't available in this runtime." : "";
			setGoogleError(
				`Google Sign-In requires a custom dev client or release build.${details} If you're using Expo Go, run "expo run:android" or build with EAS.`
			);
			return;
		}

		if (!GOOGLE_WEB_CLIENT_ID) {
			setGoogleConfigured(false);
			setGoogleError("Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.");
			return;
		}

		GoogleSigninModule.configure({
			webClientId: GOOGLE_WEB_CLIENT_ID,
			iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
			offlineAccess: false,
		});

		console.log("[GoogleAuth] Config check", {
			webClientId: maskClientId(GOOGLE_WEB_CLIENT_ID),
			iosClientId: maskClientId(GOOGLE_IOS_CLIENT_ID),
		});
		setGoogleConfigured(true);
	}, []);

	const validateForm = () => {
		const errors = {};

		if (!EMAIL_REGEX.test(email.trim())) {
			errors.email = "Enter a valid email address.";
		}

		if (!PASSWORD_REGEX.test(password)) {
			errors.password = "Password must be 8-64 characters.";
		}

		setFieldErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const onLogin = async () => {
		setSubmitError("");
		setGoogleError("");

		if (!validateForm()) return;

		setBusy(true);
		try {
			const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
			onSuccess?.(userCredential.user);
		} catch (err) {
			setSubmitError(mapFirebaseAuthError(err?.code));
		} finally {
			setBusy(false);
		}
	};

	const onGoogleLogin = async () => {
		if (googleBusy || busy || !googleConfigured || !GoogleSigninModule) return;
		setSubmitError("");
		setGoogleError("");
		setGoogleBusy(true);

		try {
			await GoogleSigninModule.hasPlayServices({ showPlayServicesUpdateDialog: true });
			await GoogleSigninModule.signOut();
			const signInResult = await GoogleSigninModule.signIn();

			let idToken = signInResult?.idToken || signInResult?.data?.idToken;
			if (!idToken) {
				const tokens = await GoogleSigninModule.getTokens();
				idToken = tokens?.idToken;
			}

			if (!idToken) {
				setGoogleError("Google sign-in failed: missing id token.");
				return;
			}

			const credential = GoogleAuthProvider.credential(idToken);
			const userCredential = await signInWithCredential(auth, credential);
			onSuccess?.(userCredential.user);
		} catch (error) {
			console.log("[GoogleAuth] Sign-in exception", {
				code: error?.code,
				message: error?.message,
				stack: error?.stack,
			});
			if (error?.code?.startsWith("auth/")) {
				setGoogleError(mapFirebaseAuthError(error?.code));
			} else {
				setGoogleError(mapGoogleSignInError(error));
			}
		} finally {
			setGoogleBusy(false);
		}
	};

	return (
		<View style={s.wrapper}>
			<Text style={[type.h2, { marginBottom: 6 }]}>Welcome back</Text>
			<Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-tertiary"]), marginBottom: 16 }]}>
				Sign in with your email and password.
			</Text>

			<View style={s.form}>
				<TextInput
					label="Email"
					required
					placeholder="you@example.com"
					value={email}
					onChangeText={setEmail}
					keyboardType="email-address"
					autoCapitalize="none"
					error={fieldErrors.email}
					rightSlot={<EnvelopeSimple size={20} color={rgb(tokens["--text-neutral-tertiary"])} />}
				/>

				<TextInput
					label="Password"
					required
					placeholder="Enter your password"
					value={password}
					onChangeText={setPassword}
					secureText={!showPassword}
					autoCapitalize="none"
					error={fieldErrors.password}
					rightSlot={
						<Pressable
							onPress={() => setShowPassword((prev) => !prev)}
							hitSlop={6}
							accessibilityRole="button"
							accessibilityLabel={showPassword ? "Hide password" : "Show password"}
						>
							{showPassword ? (
								<EyeSlash size={20} color={rgb(tokens["--text-neutral-tertiary"])} />
							) : (
								<Eye size={20} color={rgb(tokens["--text-neutral-tertiary"])} />
							)}
						</Pressable>
					}
				/>

				{submitError ? (
					<Text style={[type.caption, { color: rgb(tokens["--text-error-primary"]) }]}>{submitError}</Text>
				) : null}

				<Button
					label="Sign in"
					onPress={onLogin}
					loading={busy}
					disabled={busy}
					fullWidth
					leftIcon={<SignIn size={20} color={rgb(tokens["--shared-text-on-filled"])} weight="bold" />}
				/>

				{googleError ? (
					<Text style={[type.caption, { color: rgb(tokens["--text-error-primary"]) }]}>{googleError}</Text>
				) : null}

				<Text style={[type.caption, s.separator, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>OR</Text>

				<Button
					variant="secondary"
					label="Continue with Google"
					onPress={onGoogleLogin}
					loading={googleBusy}
					disabled={busy || googleBusy || !googleConfigured}
					fullWidth
					leftIcon={<GoogleIcon size={20} />}
				/>

				<Pressable onPress={onSwitchToRegister} style={s.switchBtn}>
					<Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
						New here? <Text style={{ color: rgb(tokens["--text-neutral-primary"]) }}>Create an account</Text>
					</Text>
				</Pressable>
			</View>
		</View>
	);
}

const s = StyleSheet.create({
	wrapper: {
		width: "100%",
	},
	form: {
		gap: 12,
	},
	separator: {
		alignSelf: "center",
		letterSpacing: 1.2,
	},
	switchBtn: {
		alignItems: "center",
		paddingVertical: 6,
	},
});
