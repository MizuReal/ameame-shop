import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

import { EnvelopeSimple, Eye, EyeSlash, User, UserPlus } from "phosphor-react-native";
import { auth } from "../../modules/firebase/client";
import { useColors } from "../../shared/colors/colorContext";
import { rgb } from "../../shared/styles/styleUtils";
import { makeTypeStyles } from "../../shared/typography/scale";
import Button from "../../shared/components/action/Button";
import TextInput from "../../shared/components/input/TextInput";

const USERNAME_REGEX = /^(?=.{3,24}$)[A-Za-z0-9._-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/;

function mapFirebaseAuthError(code) {
	if (code === "auth/email-already-in-use") return "This email is already in use.";
	if (code === "auth/invalid-email") return "Please enter a valid email address.";
	if (code === "auth/weak-password") return "Use a stronger password.";
	if (code === "auth/network-request-failed") return "Network error. Check your connection and retry.";
	return "Unable to create account right now. Please try again.";
}

export default function Register({ onSwitchToLogin, onSuccess }) {
	const tokens = useColors();
	const type = useMemo(() => makeTypeStyles(tokens), [tokens]);

	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [fieldErrors, setFieldErrors] = useState({});
	const [submitError, setSubmitError] = useState("");
	const [busy, setBusy] = useState(false);

	const validateForm = () => {
		const errors = {};

		if (!USERNAME_REGEX.test(username.trim())) {
			errors.username = "3-24 chars: letters, numbers, dot, underscore, or dash.";
		}

		if (!EMAIL_REGEX.test(email.trim())) {
			errors.email = "Enter a valid email address.";
		}

		if (!PASSWORD_REGEX.test(password)) {
			errors.password = "8+ chars with upper, lower, number, and symbol.";
		}

		if (confirmPassword !== password) {
			errors.confirmPassword = "Passwords do not match.";
		}

		setFieldErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const onRegister = async () => {
		setSubmitError("");

		if (!validateForm()) return;

		setBusy(true);
		try {
			const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
			await updateProfile(userCredential.user, { displayName: username.trim() });
			onSuccess?.(userCredential.user);
		} catch (err) {
			setSubmitError(mapFirebaseAuthError(err?.code));
		} finally {
			setBusy(false);
		}
	};

	return (
		<View style={s.wrapper}>
			<Text style={[type.h2, { marginBottom: 6 }]}>Create account</Text>
			<Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-tertiary"]), marginBottom: 16 }]}>
				Register with email and password.
			</Text>

			<View style={s.form}>
				<TextInput
					label="Username"
					required
					placeholder="john_doe"
					value={username}
					onChangeText={setUsername}
					autoCapitalize="none"
					error={fieldErrors.username}
					rightSlot={<User size={20} color={rgb(tokens["--text-neutral-tertiary"])} />}
				/>

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
						placeholder="Enter strong password"
						value={password}
						onChangeText={setPassword}
						secureText={!showPassword}
						autoCapitalize="none"
						error={fieldErrors.password}
						hint="At least 8 chars including upper, lower, number, and symbol."
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

					<TextInput
						label="Confirm password"
						required
						placeholder="Re-enter password"
						value={confirmPassword}
						onChangeText={setConfirmPassword}
						secureText={!showConfirmPassword}
						autoCapitalize="none"
						error={fieldErrors.confirmPassword}
						rightSlot={
							<Pressable
								onPress={() => setShowConfirmPassword((prev) => !prev)}
								hitSlop={6}
								accessibilityRole="button"
								accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
							>
								{showConfirmPassword ? (
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
					label="Create account"
					onPress={onRegister}
					loading={busy}
					disabled={busy}
					fullWidth
					leftIcon={<UserPlus size={20} color={rgb(tokens["--shared-text-on-filled"])} weight="bold" />}
				/>

				<Pressable onPress={onSwitchToLogin} style={s.switchBtn}>
					<Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
						Already have an account? <Text style={{ color: rgb(tokens["--text-neutral-primary"]) }}>Sign in</Text>
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
	switchBtn: {
		alignItems: "center",
		paddingVertical: 6,
	},
});
