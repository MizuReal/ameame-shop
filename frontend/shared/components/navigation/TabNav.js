/**
 * TabNav.js
 * ─────────────────────────────────────────────────────────────
 * Inline segmented tab switcher.
 *
 * Design refs:
 *   manga_ecommerce_mobile_ui  — .chip / .chip.active
 *     1.5px ink border · rounded-md · active = ink fill + white text
 *   manga_ui_rounded_corners   — .mn-btn row
 *     transparent bg · 1.5px ink border · solid variant = ink fill
 *
 * Contained variant:
 *   Tabs sit side by side in a row, each with a full ink border.
 *   Active tab flips to ink fill + white text (chip.active pattern).
 *   No outer track wrapper — the tabs themselves are the affordance.
 *
 * Underline variant:
 *   Flat row separated by a hairline bottom rule.
 *   Active tab gets a 2px ink bottom bar.
 *
 * Props:
 *   tabs       { key: string, label: string }[]
 *   activeKey  string
 *   onChange   (key: string) => void
 *   variant    "contained" | "underline"   default: "contained"
 *   fullWidth  boolean                     default: true
 *
 * Usage:
 *   <TabNav
 *     tabs={[{ key: "login", label: "Login" }, { key: "register", label: "Register" }]}
 *     activeKey={mode}
 *     onChange={setMode}
 *   />
 */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb }       from "@shared/styles/styleUtils";

export default function TabNav({
  tabs = [],
  activeKey,
  onChange,
  variant = "contained",
  fullWidth = true,
}) {
  const tokens = useColors();

  const ink  = rgb(tokens["--base-foreground"]);
  const paper = rgb(tokens["--base-canvas"]);

  // ── Underline ─────────────────────────────────────────────────────────────
  if (variant === "underline") {
    return (
      <View style={[
        s.underlineTrack,
        { borderBottomColor: rgb(tokens["--border-neutral-primary"]) },
        fullWidth && s.fullWidth,
      ]}>
        {tabs.map(({ key, label }) => {
          const isActive = key === activeKey;
          return (
            <Pressable
              key={key}
              onPress={() => onChange?.(key)}
              style={s.underlineTab}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[
                s.label,
                {
                  color: isActive ? ink : rgb(tokens["--text-neutral-tertiary"]),
                  fontWeight: isActive ? "700" : "500",
                },
              ]}>
                {label}
              </Text>
              {isActive && (
                <View style={[s.underlineBar, { backgroundColor: ink }]} />
              )}
            </Pressable>
          );
        })}
      </View>
    );
  }

  // ── Contained (chip row) ──────────────────────────────────────────────────
  // Each tab is its own bordered chip. Active = ink fill, inactive = outline.
  // No outer track — matches .chip / .chip.active from ecommerce ref.
  return (
    <View style={[s.chipRow, fullWidth && s.fullWidth]}>
      {tabs.map(({ key, label }, i) => {
        const isActive = key === activeKey;
        const isFirst  = i === 0;
        const isLast   = i === tabs.length - 1;

        return (
          <Pressable
            key={key}
            onPress={() => onChange?.(key)}
            style={({ pressed }) => [
              s.chip,
              {
                backgroundColor: isActive ? ink : "transparent",
                borderColor: ink,
                // Collapse shared border between adjacent chips
                borderLeftWidth: isFirst ? 1.5 : 0.75,
                borderRightWidth: isLast ? 1.5 : 0.75,
                borderTopLeftRadius:     isFirst ? 6 : 0,
                borderBottomLeftRadius:  isFirst ? 6 : 0,
                borderTopRightRadius:    isLast  ? 6 : 0,
                borderBottomRightRadius: isLast  ? 6 : 0,
              },
              pressed && !isActive && { opacity: 0.65 },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[
              s.label,
              {
                color: isActive
                  ? paper
                  : rgb(tokens["--text-neutral-primary"]),
              },
            ]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  fullWidth: { alignSelf: "stretch" },

  // ── Chip row ───────────────────────────────────────────────────────────────
  chipRow: {
    flexDirection: "row",
  },
  chip: {
    flex:            1,
    alignItems:      "center",
    justifyContent:  "center",
    paddingVertical: 10,
    borderTopWidth:    1.5,
    borderBottomWidth: 1.5,
  },

  // ── Underline ──────────────────────────────────────────────────────────────
  underlineTrack: {
    flexDirection:     "row",
    borderBottomWidth: 0.75,
  },
  underlineTab: {
    flex:           1,
    alignItems:     "center",
    paddingTop:     4,
    paddingBottom:  12,
  },
  underlineBar: {
    position:     "absolute",
    bottom:       0,
    left:         12,
    right:        12,
    height:       2,
    borderRadius: 1,
  },

  // ── Shared ─────────────────────────────────────────────────────────────────
  label: {
    fontFamily:    "Inter-Bold",
    fontSize:      12,
    lineHeight:    16,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});