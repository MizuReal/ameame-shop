/**
 * WishlistButton.js
 * ─────────────────────────────────────────────────────────────
 * Heart/wishlist toggle. Outline inactive, brand-tinted active.
 *
 * Props:
 *   isWishlisted  boolean           default: false
 *   onToggle      (next: boolean) => void
 *   icon          ReactNode — inactive icon
 *   activeIcon    ReactNode — active icon (falls back to icon)
 *   size          "md" | "sm"   default: "md"
 *   disabled      boolean
 */

import { cloneElement, isValidElement } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";

export default function WishlistButton({
  isWishlisted = false,
  onToggle,
  icon,
  activeIcon,
  size     = "md",
  disabled = false,
}) {
  const tokens    = useColors();
  const dimension = size === "sm" ? 36 : 48;

  const bgColor = disabled
    ? rgb(tokens["--surface-neutral-primary"])
    : isWishlisted
    ? rgb(tokens["--surface-brand-secondary"])
    : rgb(tokens["--base-canvas"]);

  const borderColor = disabled
    ? rgb(tokens["--border-neutral-primary-disabled"])
    : isWishlisted
    ? rgb(tokens["--border-brand-secondary"])
    : rgb(tokens["--border-neutral-primary"]);

  const renderedIcon = isWishlisted && activeIcon ? activeIcon : icon;
  const coloredIcon = isWishlisted && isValidElement(renderedIcon)
    ? cloneElement(renderedIcon, { color: borderColor })
    : renderedIcon;

  return (
    <Pressable
      onPress={() => !disabled && onToggle?.(!isWishlisted)}
      accessibilityRole="button"
      accessibilityLabel={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      accessibilityState={{ checked: isWishlisted, disabled }}
      style={({ pressed }) => [
        s.base,
        { width: dimension, height: dimension, backgroundColor: bgColor, borderColor },
        pressed && !disabled && { opacity: 0.7 },
      ]}
    >
      {coloredIcon && <View style={s.iconWrap}>{coloredIcon}</View>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    borderRadius:   6,
    borderWidth:    1.5,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  iconWrap: {
    flexShrink: 0,
  },
});
