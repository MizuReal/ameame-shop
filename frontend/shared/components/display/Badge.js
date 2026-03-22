/**
 * Badge.js
 * ─────────────────────────────────────────────────────────────
 * Small inline label for status, category, or emphasis.
 *
 * Props:
 *   label     string
 *   variant   "filled"|"outline"|"brand"|"brand-subtle"|
 *             "success"|"warning"|"error"|"muted"   default: "filled"
 *   size      "sm"|"md"   default: "md"
 *   uppercase boolean     default: true
 */

import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

export default function Badge({
  label,
  variant   = "filled",
  size      = "md",
  uppercase = true,
}) {
  const tokens = useColors();

  // ── Variant → token keys ──────────────────────────────────────────────────
  const VARIANT = {
    "filled":       { bg: tokens["--surface-neutral-strong"],    text: tokens["--text-neutral-inverted"],    border: null },
    "outline":      { bg: "transparent",                         text: tokens["--text-neutral-primary"],     border: tokens["--border-neutral-primary"] },
    "brand":        { bg: tokens["--surface-brand-primary"],     text: tokens["--shared-text-on-filled"],    border: null },
    "brand-subtle": { bg: tokens["--surface-brand-secondary"],   text: tokens["--text-brand-primary"],       border: tokens["--border-brand-secondary"] },
    "success":      { bg: tokens["--surface-success-secondary"], text: tokens["--text-success-primary"],     border: tokens["--border-success-secondary"] },
    "warning":      { bg: tokens["--surface-warning-secondary"], text: tokens["--text-warning-primary"],     border: tokens["--border-warning-secondary"] },
    "error":        { bg: tokens["--surface-error-primary"],     text: tokens["--shared-text-on-filled"],    border: null },
    "muted":        { bg: tokens["--surface-neutral-primary"],   text: tokens["--text-neutral-secondary"],   border: tokens["--border-neutral-secondary"] },
  };

  const v = VARIANT[variant] ?? VARIANT.filled;

  // ── Size ──────────────────────────────────────────────────────────────────
  const isSm       = size === "sm";
  const fontSize    = isSm ? 9  : 10;
  const paddingV    = isSm ? 3  : 5;
  const paddingH    = isSm ? 8  : 12;
  const tracking    = isSm ? 1  : 0.5;

  return (
    <View style={[
      s.base,
      {
        backgroundColor: rgb(v.bg),
        paddingVertical:   paddingV,
        paddingHorizontal: paddingH,
        borderWidth:  v.border ? 1 : 0,
        borderColor:  v.border ? rgb(v.border) : "transparent",
      },
    ]}>
      <Text style={{
        fontFamily:    fonts.ui.bold,
        fontSize,
        letterSpacing: tracking,
        color:         rgb(v.text),
        textTransform: uppercase ? "uppercase" : "none",
      }}>
        {label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    borderRadius: 6,
    alignSelf:    "flex-start",
  },
});
