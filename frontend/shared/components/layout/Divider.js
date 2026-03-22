/**
 * Divider.js
 * ─────────────────────────────────────────────────────────────
 * Horizontal rule separating sections or list items.
 *
 * Design refs:
 *   manga_ecommerce_mobile_ui  — .detail-rule (1px, rule color)
 *   manga_ui_rounded_corners   — --rule-hair (0.75px, rgba ink 0.25)
 *
 * Props:
 *   weight    "hairline" | "regular"   default: "hairline"
 *             hairline → 0.75px (panel separators, list rows)
 *             regular  → 1px    (section separators, detail rule)
 *   spacing   "none" | "sm" | "md"    default: "none"
 *             adds vertical margin above and below
 *   color     "weak" | "secondary"    default: "weak"
 *             weak      → border-neutral-weak     (subtlest)
 *             secondary → border-neutral-secondary (more visible)
 *
 * Usage:
 *   <Divider />
 *   <Divider weight="regular" spacing="md" />
 *   <Divider color="secondary" />
 */

import { StyleSheet, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";

export default function Divider({
  weight  = "hairline",
  spacing = "none",
  color   = "weak",
}) {
  const tokens = useColors();

  const borderColor = color === "secondary"
    ? rgb(tokens["--border-neutral-secondary"])
    : rgb(tokens["--border-neutral-weak"]);

  const height = weight === "regular" ? 1 : 0.75;

  const marginV = { none: 0, sm: 8, md: 14 }[spacing] ?? 0;

  return (
    <View style={[
      s.line,
      { height, backgroundColor: borderColor, marginVertical: marginV },
    ]} />
  );
}

const s = StyleSheet.create({
  line: { width: "100%" },
});
