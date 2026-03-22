/**
 * Spinner.js
 * ─────────────────────────────────────────────────────────────
 * Loading spinner. Thin wrapper around ActivityIndicator that
 * sources its color from the token system.
 *
 * Props:
 *   size      "sm" | "md" | "lg"   default: "md"
 *             sm = small ActivityIndicator
 *             md = large ActivityIndicator
 *             lg = large ActivityIndicator + more padding
 *   variant   "neutral" | "brand" | "onFilled"   default: "neutral"
 *             neutral  → neutral primary color  (on canvas surfaces)
 *             brand    → brand primary color    (branded loading states)
 *             onFilled → on-filled color        (inside filled buttons/surfaces)
 *   label     string — optional text below the spinner
 *   style     ViewStyle
 *
 * Usage:
 *   <Spinner />
 *   <Spinner size="lg" label="Loading products…" />
 *   <Spinner variant="onFilled" size="sm" />
 */

import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

export default function Spinner({
  size    = "md",
  variant = "neutral",
  label,
  style,
}) {
  const tokens = useColors();

  const color = {
    neutral:  rgb(tokens["--text-neutral-primary"]),
    brand:    rgb(tokens["--text-brand-primary"]),
    onFilled: rgb(tokens["--shared-text-on-filled"]),
  }[variant];

  const rnSize = size === "sm" ? "small" : "large";
  const pad    = size === "lg" ? 24 : 12;

  return (
    <View style={[s.container, { padding: pad }, style]}>
      <ActivityIndicator size={rnSize} color={color} />
      {label && (
        <Text style={[s.label, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems:     "center",
    justifyContent: "center",
    gap:            10,
  },
  label: {
    fontFamily:    fonts.ui.regular,
    fontSize:      12,
    letterSpacing: 0.5,
  },
});
