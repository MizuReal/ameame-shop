/**
 * Tag.js
 * ─────────────────────────────────────────────────────────────
 * Interactive chip / filter tag. Pressable, toggleable, or dismissible.
 * Distinct from Badge — Tags are interactive UI controls,
 * Badges are static status indicators.
 *
 * Design refs:
 *   manga_ecommerce_mobile_ui  — .chip, .chip.active
 *                                border 1.5px ink · rounded-md · bold 11px
 *                                active: ink fill, white text
 *   manga_ui_rounded_corners   — .mn-tag (outline/filled variants)
 *
 * Props:
 *   label     string
 *   active    boolean   default: false — filled state
 *   onPress   () => void — makes the tag pressable/toggleable
 *   onRemove  () => void — shows × button for dismissible tags
 *   disabled  boolean
 *   size      "sm" | "md"   default: "md"
 *
 * Usage:
 *   // Filter chip (toggleable)
 *   <Tag label="ファッション" active={active} onPress={() => setActive(!active)} />
 *
 *   // Category chip row
 *   {categories.map(cat => (
 *     <Tag
 *       key={cat.id}
 *       label={cat.name}
 *       active={selectedCategory === cat.id}
 *       onPress={() => setSelectedCategory(cat.id)}
 *     />
 *   ))}
 *
 *   // Dismissible tag
 *   <Tag label="Sale" onRemove={() => removeFilter("sale")} />
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

export default function Tag({
  label,
  active   = false,
  onPress,
  onRemove,
  disabled = false,
  size     = "md",
  icon,
}) {
  const tokens = useColors();
  const isSm   = size === "sm";

  const bgColor = active
    ? rgb(disabled ? tokens["--surface-neutral-secondary"] : tokens["--surface-neutral-strong"])
    : rgb(tokens["--base-canvas"]);

  const borderColor = active
    ? rgb(tokens["--border-neutral-primary"])
    : rgb(tokens["--border-neutral-primary"]);

  const textColor = active
    ? rgb(tokens["--text-neutral-inverted"])
    : rgb(disabled
        ? tokens["--text-neutral-primary-disabled"]
        : tokens["--text-neutral-primary"]);

  const paddingH = isSm ? 10 : 14;
  const paddingV = isSm ? 5  : 7;
  const fontSize = isSm ? 10 : 11;

  const inner = (
    <View style={[
      s.inner,
      { paddingHorizontal: paddingH, paddingVertical: paddingV },
    ]}>
      {icon ? <View style={s.iconWrap}>{icon}</View> : null}
      <Text style={[s.label, { fontSize, color: textColor }]}>
        {label}
      </Text>
      {onRemove && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onRemove();
          }}
          accessibilityLabel={`Remove ${label}`}
          style={({ pressed }) => [s.removeBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={[s.removeIcon, { color: textColor }]}>✕</Text>
        </Pressable>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={!disabled ? onPress : undefined}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: active, disabled }}
        style={({ pressed }) => [
          s.base,
          { backgroundColor: bgColor, borderColor },
          pressed && !disabled && { opacity: 0.75 },
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={[s.base, { backgroundColor: bgColor, borderColor }]}>
      {inner}
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    borderRadius: 6,
    borderWidth:  1.5,
    alignSelf:    "flex-start",
  },
  inner: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily:    fonts.ui.bold,
    letterSpacing: 0.5,
  },
  removeBtn: {
    padding: 1,
  },
  removeIcon: {
    fontFamily: fonts.ui.bold,
    fontSize:   9,
    lineHeight: 11,
  },
});
