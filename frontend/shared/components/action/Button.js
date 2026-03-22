/**
 * Button.js
 * ─────────────────────────────────────────────────────────────
 * General-purpose button. Covers all variants across the app.
 *
 * Design refs:
 *   manga_ecommerce_mobile_ui  — btn-cart, btn-buy, dbtn, banner-btn
 *   manga_ui_rounded_corners   — mn-btn (solid, ghost, danger, sm)
 *
 * Props:
 *   variant     "primary" | "secondary" | "ghost" | "danger"   default: "primary"
 *   size        "base" | "sm"                                   default: "base"
 *   label       string
 *   onPress     () => void
 *   disabled    boolean
 *   loading     boolean
 *   fullWidth   boolean
 *   leftIcon    ReactNode
 *   rightIcon   ReactNode
 */

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { typeBase } from "@typography/scale";

export default function Button({
  variant = "primary",
  size = "base",
  label,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  align = "flex-start",
  style,
  leftIcon,
  rightIcon,
}) {
  const tokens     = useColors();
  const isDisabled = disabled || loading;

  // ── Background ────────────────────────────────────────────────────────────
  const bgColor = isDisabled
    ? {
        primary:   rgb(tokens["--surface-brand-primary-disabled"]),
        secondary: "transparent",
        ghost:     "transparent",
        danger:    rgb(tokens["--surface-error-primary-disabled"]),
      }[variant]
    : {
        primary:   rgb(tokens["--surface-brand-primary"]),
        secondary: "transparent",
        ghost:     "transparent",
        danger:    rgb(tokens["--surface-error-primary"]),
      }[variant];

  // ── Border ────────────────────────────────────────────────────────────────
  const borderStyle = isDisabled
    ? {
        primary:   {},
        secondary: { borderWidth: 1.5, borderColor: rgb(tokens["--border-neutral-primary-disabled"]) },
        ghost:     { borderWidth: 1,   borderColor: rgb(tokens["--border-neutral-primary-disabled"]), borderStyle: "dashed" },
        danger:    {},
      }[variant]
    : {
        primary:   {},
        secondary: { borderWidth: 1.5, borderColor: rgb(tokens["--border-neutral-primary"]) },
        ghost:     { borderWidth: 1,   borderColor: rgb(tokens["--border-neutral-primary"]),   borderStyle: "dashed" },
        danger:    {},
      }[variant];

  // ── Label color ───────────────────────────────────────────────────────────
  const labelColor = isDisabled
    ? {
        primary:   rgb(tokens["--shared-text-on-filled-disabled"]),
        secondary: rgb(tokens["--text-neutral-primary-disabled"]),
        ghost:     rgb(tokens["--text-neutral-primary-disabled"]),
        danger:    rgb(tokens["--shared-text-on-filled-disabled"]),
      }[variant]
    : {
        primary:   rgb(tokens["--shared-text-on-filled"]),
        secondary: rgb(tokens["--text-neutral-primary"]),
        ghost:     rgb(tokens["--text-neutral-secondary"]),
        danger:    rgb(tokens["--shared-text-on-filled"]),
      }[variant];

  // ── Size ──────────────────────────────────────────────────────────────────
  const sizeStyle = size === "sm"
    ? { height: 36, paddingHorizontal: 14, gap: 6 }
    : { height: 48, paddingHorizontal: 20, gap: 8 };

  const labelStyle = size === "sm"
    ? { ...typeBase.btnSm, color: labelColor, letterSpacing: 1.5 }
    : { ...typeBase.btnBase, color: labelColor, letterSpacing: 1 };

  const spinnerColor = variant === "secondary" || variant === "ghost"
    ? rgb(tokens["--text-neutral-primary"])
    : rgb(tokens["--shared-text-on-filled"]);

  return (
    <Pressable
      onPress={!isDisabled ? onPress : undefined}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        s.base,
        sizeStyle,
        borderStyle,
        { backgroundColor: bgColor },
        fullWidth ? { width: "100%" } : { alignSelf: align },
        style,
        pressed && !isDisabled && { opacity: 0.75 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {leftIcon  && <View style={s.iconWrap}>{leftIcon}</View>}
          <Text style={labelStyle}>{label}</Text>
          {rightIcon && <View style={s.iconWrap}>{rightIcon}</View>}
        </>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    borderRadius:   6,
    overflow:       "hidden",
  },
  iconWrap: {
    flexShrink: 0,
  },
});
