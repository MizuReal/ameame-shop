/**
 * IconButton.js
 * ─────────────────────────────────────────────────────────────
 * Square icon-only button — no label text.
 *
 * Props:
 *   icon               ReactNode
 *   onPress            () => void
 *   variant            "outline" | "filled" | "ghost"   default: "outline"
 *   size               "md" | "sm"                       default: "md"
 *                      md = 40×40px, sm = 28×28px
 *   badge              string | number — count bubble top-right
 *   disabled           boolean
 *   accessibilityLabel string
 */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { typeBase } from "@typography/scale";

export default function IconButton({
  icon,
  onPress,
  variant = "outline",
  size = "md",
  badge,
  disabled = false,
  accessibilityLabel,
}) {
  const tokens = useColors();

  // ── Size ──────────────────────────────────────────────────────────────────
  const dimension   = size === "sm" ? 28 : 40;
  const borderRadius = size === "sm" ? 5  : 6;

  // ── Variant ───────────────────────────────────────────────────────────────
  const variantStyle = {
    outline: {
      backgroundColor: rgb(tokens["--base-canvas"]),
      borderWidth:     1,
      borderColor:     rgb(disabled
        ? tokens["--border-neutral-primary-disabled"]
        : tokens["--border-neutral-primary"]),
    },
    filled: {
      backgroundColor: rgb(disabled
        ? tokens["--surface-brand-primary-disabled"] + "66"
        : tokens["--surface-brand-primary"]),
    },
    ghost: {
      backgroundColor: "transparent",
    },
  }[variant];

  const hasBadge = badge !== undefined && badge !== null;

  return (
    <Pressable
      onPress={!disabled ? onPress : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        s.base,
        { width: dimension, height: dimension, borderRadius },
        variantStyle,
        pressed && !disabled && { opacity: 0.7 },
      ]}
    >
      {icon}

      {hasBadge && (
        <View style={[
          s.badge,
          { backgroundColor: rgb(tokens["--surface-error-primary"]),
            borderColor:      rgb(tokens["--base-canvas"]) },
        ]}>
          <Text style={[
            typeBase.caption,
            { fontSize: 8, color: rgb(tokens["--shared-text-on-filled"]), lineHeight: 10 },
          ]}>
            {String(badge)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    alignItems:     "center",
    justifyContent: "center",
  },
  badge: {
    position:        "absolute",
    top:             -3,
    right:           -3,
    minWidth:        14,
    height:          14,
    borderRadius:    7,
    borderWidth:     2,
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 2,
  },
});
