/**
 * BuyNowButton.js
 * ─────────────────────────────────────────────────────────────
 * Accent-coloured "Buy Now" CTA. Fixed width in the CTA row.
 *
 * Props:
 *   onPress     () => void
 *   loading     boolean
 *   disabled    boolean
 *   label       string   default: "Buy Now"
 *   icon        ReactNode
 *   fullWidth   boolean  default: false
 */

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { typeBase } from "@typography/scale";

export default function BuyNowButton({
  onPress,
  loading   = false,
  disabled  = false,
  label     = "Buy Now",
  icon,
  fullWidth = false,
}) {
  const tokens     = useColors();
  const isDisabled = disabled || loading;

  const bgColor = isDisabled
    ? rgb(tokens["--surface-brand-primary-disabled"])
    : rgb(tokens["--surface-brand-primary"]);

  return (
    <Pressable
      onPress={!isDisabled ? onPress : undefined}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        s.base,
        fullWidth ? { flex: 1 } : { width: 100 },
        { backgroundColor: bgColor },
        pressed && !isDisabled && { opacity: 0.8 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={rgb(tokens["--shared-text-on-filled"])} />
      ) : (
        <>
          {icon && <View style={s.iconWrap}>{icon}</View>}
          <Text style={[
            typeBase.btnSm,
            { color: rgb(tokens["--shared-text-on-filled"]), letterSpacing: 0.5 },
          ]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    height:         48,
    borderRadius:   6,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
    gap:            8,
  },
  iconWrap: {
    flexShrink: 0,
  },
});
