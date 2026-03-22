/**
 * AddToCartButton.js
 * ─────────────────────────────────────────────────────────────
 * Dedicated "Add to Cart" CTA. Ink fill, icon left, label right.
 *
 * Props:
 *   onPress     () => void
 *   loading     boolean
 *   disabled    boolean
 *   label       string   default: "Add to Cart"
 *   icon        ReactNode
 *   fullWidth   boolean  default: true
 *   iconOnly    boolean  default: false — square button, no label
 *   size        "md" | "sm"  default: "md"
 */

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { typeBase } from "@typography/scale";

export default function AddToCartButton({
  onPress,
  loading   = false,
  disabled  = false,
  label     = "Add to Cart",
  icon,
  fullWidth = true,
  iconOnly  = false,
  size      = "md",
}) {
  const tokens     = useColors();
  const isDisabled = disabled || loading;

  const bgColor = isDisabled
    ? rgb(tokens["--surface-accent-primary-disabled"]) + "66"
    : rgb(tokens["--surface-accent-primary"]);

  const dim = size === "sm" ? 30 : 48;

  return (
    <Pressable
      onPress={!isDisabled ? onPress : undefined}
      accessibilityRole="button"
      accessibilityLabel={iconOnly ? "Add to cart" : label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        s.base,
        iconOnly
          ? { width: dim, height: dim }
          : fullWidth
            ? { flex: 1, height: dim }
            : [s.standalone, { height: dim }],
        { backgroundColor: bgColor },
        pressed && !isDisabled && { opacity: 0.8 },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={rgb(tokens["--shared-text-on-filled"])}
        />
      ) : iconOnly ? (
        icon ? <View style={s.iconWrap}>{icon}</View> : null
      ) : (
        <>
          {icon && <View style={s.iconWrap}>{icon}</View>}
          <Text
            style={[
              typeBase.btnBase,
              {
                color:         rgb(tokens["--shared-text-on-filled"]),
                letterSpacing: 1,
                fontSize:      size === "sm" ? 12 : 13,
              },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    borderRadius:   6,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
  },
  standalone: {
    alignSelf:         "flex-start",
    paddingHorizontal: 20,
  },
  iconWrap: {
    flexShrink: 0,
  },
});