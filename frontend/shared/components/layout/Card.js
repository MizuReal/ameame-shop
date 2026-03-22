/**
 * Card.js
 * ─────────────────────────────────────────────────────────────
 * General-purpose surface container. Provides the bordered,
 * rounded card shell used throughout the app.
 *
 * Design refs:
 *   manga_ecommerce_mobile_ui  — .prod-card (1px border, rounded-xl, white bg)
 *   manga_ui_rounded_corners   — .panel, .mn-profile (rule border, rounded-md)
 *
 * Props:
 *   children    ReactNode
 *   variant     "elevated" | "outlined" | "filled"   default: "outlined"
 *               outlined → canvas bg + neutral border (standard card)
 *               filled   → neutral-primary surface bg  (panel / inset)
 *               elevated → canvas bg + shadow, no border
 *   radius      "md" | "lg"   default: "md"
 *               md = 6px  (mn-profile, prod-card style)
 *               lg = 12px (panel, rounded card)
 *   padding     "none" | "sm" | "md" | "lg"   default: "none"
 *               none = 0, sm = 12, md = 16, lg = 20
 *   onPress     () => void — makes the card pressable
 *   style       ViewStyle — additional style overrides
 *
 * Usage:
 *   <Card>
 *     <Text>Content</Text>
 *   </Card>
 *
 *   <Card variant="filled" radius="lg" padding="md">
 *     <SectionHeader title="Progress" variant="rule" paddingH={false} />
 *     <ProgressBar ... />
 *   </Card>
 *
 *   <Card onPress={handlePress}>
 *     <ProductInfo ... />
 *   </Card>
 */

import { Pressable, StyleSheet, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";

export default function Card({
  children,
  variant = "outlined",
  radius  = "md",
  padding = "none",
  onPress,
  style,
}) {
  const tokens = useColors();

  const bgColor = {
    outlined: rgb(tokens["--base-canvas"]),
    filled:   rgb(tokens["--surface-neutral-primary"]),
    elevated: rgb(tokens["--base-canvas"]),
  }[variant];

  const borderStyle = variant === "elevated"
    ? {}
    : {
        borderWidth: variant === "outlined" ? 1 : 1,
        borderColor: rgb(tokens[
          variant === "filled"
            ? "--border-neutral-secondary"
            : "--border-neutral-primary"
        ]),
      };

  const shadowStyle = variant === "elevated"
    ? {
        shadowColor:   "#000",
        shadowOpacity: 0.08,
        shadowRadius:  8,
        shadowOffset:  { width: 0, height: 2 },
        elevation:     3,
      }
    : {};

  const borderRadius = radius === "lg" ? 12 : 6;
  const pad          = { none: 0, sm: 12, md: 16, lg: 20 }[padding] ?? 0;

  const cardStyle = [
    s.base,
    { backgroundColor: bgColor, borderRadius, padding: pad },
    borderStyle,
    shadowStyle,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...cardStyle, pressed && { opacity: 0.85 }]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const s = StyleSheet.create({
  base: { overflow: "hidden" },
});
