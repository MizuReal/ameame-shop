/**
 * ProgressBar.js
 * ─────────────────────────────────────────────────────────────
 * Labeled progress bar with animated fill.
 *
 * Design refs:
 *   manga_ecommerce_mobile_ui  — .prog-item, .prog-track, .prog-fill
 *                                6px track · ink/accent/success fills
 *   manga_ui_rounded_corners   — .mn-track-bar, .mn-fill
 *                                4px track · ink fill · tick mark at end
 *
 * Props:
 *   value      number   0–100 (percentage)
 *   label      string   — left label above track
 *   showValue  boolean  default: true — shows percentage on the right
 *   variant    "neutral" | "brand" | "success" | "warning" | "error"
 *              default: "neutral"
 *   height     number   default: 6
 *   animated   boolean  default: true
 *
 * Usage:
 *   <ProgressBar value={78} label="進捗" />
 *   <ProgressBar value={61} label="Shipped" variant="brand" />
 *   <ProgressBar value={28} label="Delivered" variant="success" />
 */

import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

export default function ProgressBar({
  value     = 0,
  label,
  showValue = true,
  variant   = "neutral",
  height    = 6,
  animated  = true,
}) {
  const tokens   = useColors();
  const animWidth = useRef(new Animated.Value(0)).current;

  const clampedValue = Math.max(0, Math.min(100, value));

  useEffect(() => {
    if (animated) {
      Animated.timing(animWidth, {
        toValue:         clampedValue,
        duration:        400,
        useNativeDriver: false,
      }).start();
    } else {
      animWidth.setValue(clampedValue);
    }
  }, [clampedValue, animated, animWidth]);

  // ── Fill color per variant ────────────────────────────────────────────────
  const fillColor = {
    neutral: tokens["--surface-neutral-strong"],
    brand:   tokens["--surface-brand-primary"],
    success: tokens["--surface-success-primary"],
    warning: tokens["--surface-warning-primary"],
    error:   tokens["--surface-error-primary"],
  }[variant] ?? tokens["--surface-neutral-strong"];

  // ── Value text color ──────────────────────────────────────────────────────
  const valueColor = {
    neutral: tokens["--text-neutral-primary"],
    brand:   tokens["--text-brand-primary"],
    success: tokens["--text-success-primary"],
    warning: tokens["--text-warning-primary"],
    error:   tokens["--text-error-primary"],
  }[variant] ?? tokens["--text-neutral-primary"];

  const widthInterpolated = animWidth.interpolate({
    inputRange:  [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={s.container}>
      {/* Header row */}
      {(label || showValue) && (
        <View style={s.header}>
          {label && (
            <Text style={[s.label, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
              {label}
            </Text>
          )}
          {showValue && (
            <Text style={[s.value, { color: rgb(valueColor) }]}>
              {clampedValue}%
            </Text>
          )}
        </View>
      )}

      {/* Track */}
      <View style={[
        s.track,
        { height, backgroundColor: rgb(tokens["--border-neutral-weak"]) },
      ]}>
        <Animated.View style={[
          s.fill,
          { height, width: widthInterpolated, backgroundColor: rgb(fillColor) },
        ]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "baseline",
  },
  label: {
    fontFamily:    fonts.ui.bold,
    fontSize:      10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  value: {
    fontFamily: fonts.special.bold,
    fontSize:   13,
  },
  track: {
    borderRadius: 3,
    overflow:     "hidden",
  },
  fill: {
    borderRadius: 3,
  },
});
