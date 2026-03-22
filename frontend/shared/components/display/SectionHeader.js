/**
 * SectionHeader.js
 * ─────────────────────────────────────────────────────────────
 * Section divider with accent bar or rule variant.
 *
 * Props:
 *   title     string
 *   subtitle  string
 *   action    ReactNode
 *   variant   "bar"|"rule"   default: "bar"
 *   paddingH  boolean        default: false
 */

import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

export default function SectionHeader({
  title,
  subtitle,
  action,
  variant  = "bar",
  paddingH = false,
}) {
  const tokens = useColors();
  const px     = paddingH ? 16 : 0;

  if (variant === "rule") {
    return (
      <View style={[s.ruleRow, { paddingHorizontal: px }]}>
        <Text style={[s.ruleTitle, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
          {title}
        </Text>
        <View style={[s.ruleLine, { backgroundColor: rgb(tokens["--border-neutral-weak"]) }]} />
      </View>
    );
  }

  return (
    <View style={[s.barRow, { paddingHorizontal: px }]}>
      {/* Left: bar + title + subtitle */}
      <View style={s.left}>
        <View style={[s.bar, { backgroundColor: rgb(tokens["--base-foreground"]) }]} />
        <View style={s.titleRow}>
          <Text style={[s.title, { color: rgb(tokens["--text-neutral-primary"]) }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[s.subtitle, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {action && <View>{action}</View>}
    </View>
  );
}

const s = StyleSheet.create({
  // Bar variant
  barRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingTop:     16,
    paddingBottom:  10,
  },
  left: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  bar: {
    width:        3,
    height:       16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
  },
  title: {
    fontFamily:    fonts.ui.bold,
    fontSize:      14,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily:    fonts.special.bold,
    fontSize:      10,
    letterSpacing: 1,
  },

  // Rule variant
  ruleRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
    paddingTop:    16,
    paddingBottom: 14,
  },
  ruleTitle: {
    fontFamily:    fonts.special.bold,
    fontSize:      10,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  ruleLine: {
    flex:   1,
    height: 0.75,
  },
});
