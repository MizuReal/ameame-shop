/**
 * NavBar.js
 * ─────────────────────────────────────────────────────────────
 * Top navigation bar. Canvas bg, bottom border, flexible slots.
 *
 * Design refs:
 *   manga_ecommerce_mobile_ui  — .nav-bar (logo left, icons right)
 *                                .nav-back (chevron + label left)
 *                                .nav-icon (40×40 bordered icon button)
 *   manga_ui_rounded_corners   — same back pattern with rule-thin border
 *
 * Props:
 *   title       string | ReactNode — center title (string or custom element)
 *   leftSlot    ReactNode — left side (back button, logo, etc.)
 *   rightSlot   ReactNode — right side (icon buttons, actions)
 *   border      boolean   default: true — bottom hairline border
 *   style       ViewStyle
 *
 * The NavBar owns no padding beyond the standard 10–12px vertical and
 * 20px horizontal — the parent SafeAreaView handles top insets.
 *
 * Common patterns:
 *
 *   // Home screen — logo left, icons right
 *   <NavBar
 *     leftSlot={<BrandLogo />}
 *     rightSlot={
 *       <View style={{ flexDirection: "row", gap: 8 }}>
 *         <IconButton icon={<PlusIcon />} accessibilityLabel="Add" />
 *         <IconButton icon={<CartIcon />} badge={3} accessibilityLabel="Cart" />
 *       </View>
 *     }
 *   />
 *
 *   // Detail screen — back left, title center, action right
 *   <NavBar
 *     leftSlot={<BackButton onPress={router.back} />}
 *     title="Product"
 *     rightSlot={<IconButton icon={<ShareIcon />} accessibilityLabel="Share" />}
 *   />
 */

import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

export default function NavBar({
  title,
  leftSlot,
  rightSlot,
  border = true,
  style,
}) {
  const tokens = useColors();

  return (
    <View style={[
      s.bar,
      {
        backgroundColor: rgb(tokens["--base-canvas"]),
        borderBottomWidth:  border ? 1 : 0,
        borderBottomColor:  rgb(tokens["--border-neutral-secondary"]),
      },
      style,
    ]}>
      {/* Left slot — fixed width to keep title centered */}
      <View style={s.side}>
        {leftSlot ?? <View />}
      </View>

      {/* Center title */}
      <View style={s.center}>
        {title && (
          typeof title === "string" ? (
            <Text
              style={[s.title, { color: rgb(tokens["--text-neutral-tertiary"]) }]}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : title
        )}
      </View>

      {/* Right slot — fixed width mirror of left */}
      <View style={[s.side, s.sideRight]}>
        {rightSlot ?? <View />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 20,
    paddingTop:        10,
    paddingBottom:     12,
  },
  side: {
    flex:           1,
    alignItems:     "flex-start",
    justifyContent: "center",
  },
  sideRight: {
    alignItems: "flex-end",
  },
  center: {
    flex:           2,
    alignItems:     "center",
    justifyContent: "center",
  },
  title: {
    fontFamily:    fonts.ui.bold,
    fontSize:      13,
    letterSpacing: -0.2,
  },
});
