/**
 * Breadcrumb.js
 * ─────────────────────────────────────────────────────────────
 * Horizontal path trail showing navigation hierarchy.
 * Not in the HTML refs — built from the design system tokens
 * following the same typographic and color conventions.
 *
 * Props:
 *   items   { label: string, onPress?: () => void }[]
 *           Last item is always treated as the current page
 *           (no onPress, primary color, not pressable).
 *   separator string   default: "/"
 *
 * Usage:
 *   <Breadcrumb
 *     items={[
 *       { label: "Home",     onPress: () => router.push("/") },
 *       { label: "Fashion",  onPress: () => router.push("/fashion") },
 *       { label: "Outerwear" },
 *     ]}
 *   />
 */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

export default function Breadcrumb({
  items     = [],
  separator = "/",
}) {
  const tokens = useColors();

  return (
    <View style={s.row}>
      {items.map((item, i) => {
        const isLast      = i === items.length - 1;
        const isFirst     = i === 0;
        const isPressable = !isLast && item.onPress;

        return (
          <View key={i} style={s.itemWrap}>
            {/* Separator — not shown before first item */}
            {!isFirst && (
              <Text style={[s.separator, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
                {separator}
              </Text>
            )}

            {isPressable ? (
              <Pressable
                onPress={item.onPress}
                accessibilityRole="link"
                style={({ pressed }) => pressed && { opacity: 0.6 }}
              >
                <Text style={[s.label, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
                  {item.label}
                </Text>
              </Pressable>
            ) : (
              <Text style={[
                s.label,
                {
                  color:      rgb(isLast
                    ? tokens["--text-neutral-primary"]
                    : tokens["--text-neutral-secondary"]),
                  fontFamily: isLast ? fonts.ui.bold : fonts.ui.regular,
                },
              ]}>
                {item.label}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems:    "center",
    flexWrap:      "wrap",
    gap:           4,
  },
  itemWrap: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
  },
  label: {
    fontFamily: fonts.ui.regular,
    fontSize:   12,
    letterSpacing: 0.2,
  },
  separator: {
    fontFamily: fonts.ui.regular,
    fontSize:   12,
  },
});
