/**
 * Checkbox.js
 * ─────────────────────────────────────────────────────────────
 * Tap-to-toggle checkbox with label. Controlled component.
 *
 * Props:
 *   checked   boolean
 *   onChange  (next: boolean) => void
 *   label     string | ReactNode
 *   disabled  boolean
 *   size      "sm"|"md"   default: "md"
 *   error     boolean
 */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

function Checkmark({ size }) {
  const isSm = size === "sm";
  return (
    <View style={{
      width:             isSm ? 4   : 5,
      height:            isSm ? 7   : 9,
      borderRightWidth:  isSm ? 2   : 2.5,
      borderBottomWidth: isSm ? 2   : 2.5,
      borderColor:       "rgb(250, 250, 250)",
      transform:         [{ rotate: "45deg" }],
      marginTop:         isSm ? -1  : -2,
    }} />
  );
}

export default function Checkbox({
  checked  = false,
  onChange,
  label,
  disabled = false,
  size     = "md",
  error    = false,
}) {
  const tokens = useColors();
  const isSm   = size === "sm";

  const boxDimension  = isSm ? 16 : 20;
  const boxRadius     = isSm ? 4  : 5;

  const bgColor = checked
    ? rgb(disabled ? tokens["--surface-neutral-secondary"] : tokens["--surface-brand-primary"])
    : rgb(tokens["--base-canvas"]);

  const borderColor = disabled
    ? rgb(tokens["--border-neutral-primary-disabled"])
    : error
    ? rgb(tokens["--border-error-primary"])
    : checked
    ? "transparent"
    : rgb(tokens["--border-neutral-primary"]);

  return (
    <Pressable
      onPress={() => !disabled && onChange?.(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      style={({ pressed }) => [
        s.row,
        { borderBottomColor: rgb(tokens["--border-neutral-weak"]) },
        pressed && !disabled && { opacity: 0.7 },
      ]}
    >
      {/* Box */}
      <View style={[
        s.box,
        {
          width:           boxDimension,
          height:          boxDimension,
          borderRadius:    boxRadius,
          backgroundColor: bgColor,
          borderWidth:     checked ? 0 : 1,
          borderColor,
        },
      ]}>
        {checked && <Checkmark size={size} />}
      </View>

      {/* Label */}
      {label && (
        typeof label === "string" ? (
          <Text style={[
            s.labelText,
            {
              fontSize: isSm ? 12 : 14,
              color:    rgb(disabled
                ? tokens["--text-neutral-primary-disabled"]
                : tokens["--text-neutral-primary"]),
            },
          ]}>
            {label}
          </Text>
        ) : (
          <View style={s.labelNode}>{label}</View>
        )
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  box: {
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
    marginTop:      1,
  },
  labelText: {
    fontFamily:  fonts.ui.regular,
    flex:        1,
    lineHeight:  20,
  },
  labelNode: {
    flex: 1,
  },
});
