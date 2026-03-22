/**
 * Tooltip.js
 * ─────────────────────────────────────────────────────────────
 * Press-and-hold or tap-to-show tooltip over a trigger element.
 * Shows a small dark label above (or below) the trigger.
 *
 * Design ref (manga_ui_rounded_corners — .tt-box):
 *   ink bg · rounded-md · small caret · 10px text · letter-spacing 1px
 *   font-weight 300
 *
 * Differs from Popover:
 *   Tooltip  — wraps its trigger, manages show/hide internally,
 *               text-only label, show on long press or tap
 *   Popover  — externally controlled, accepts any ReactNode content,
 *               positioned relative to a parent container
 *
 * Props:
 *   children  ReactNode — the trigger element
 *   label     string — tooltip text
 *   position  "top" | "bottom"   default: "top"
 *   trigger   "press" | "longPress"   default: "longPress"
 *
 * Usage:
 *   <Tooltip label="クリックで確定します">
 *     <Button label="保存する" onPress={handleSave} />
 *   </Tooltip>
 *
 *   <Tooltip label="Remove from wishlist" trigger="press" position="bottom">
 *     <WishlistButton ... />
 *   </Tooltip>
 */

import { useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

const CARET = 5;
const GAP   = 6;

export default function Tooltip({
  children,
  label,
  position = "top",
  trigger  = "longPress",
}) {
  const tokens    = useColors();
  const [visible, setVisible] = useState(false);
  const opacity   = useRef(new Animated.Value(0)).current;

  const show = () => {
    setVisible(true);
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  };

  const hide = () => {
    Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }).start(
      () => setVisible(false)
    );
  };

  const bgColor   = rgb(tokens["--surface-neutral-strong"]);
  const textColor = rgb(tokens["--shared-text-on-filled"]);

  const isTop = position === "top";

  return (
    <View style={s.wrap}>
      {/* Tooltip bubble */}
      {visible && (
        <Animated.View
          style={[
            s.bubble,
            isTop ? s.bubbleTop : s.bubbleBottom,
            { opacity },
          ]}
          pointerEvents="none"
        >
          {/* Caret pointing down toward trigger */}
          {isTop && (
            <View style={[s.caretDown, { borderTopColor: bgColor }]} />
          )}

          <View style={[s.label, { backgroundColor: bgColor }]}>
            <Text style={[s.text, { color: textColor }]}>{label}</Text>
          </View>

          {/* Caret pointing up toward trigger */}
          {!isTop && (
            <View style={[s.caretUp, { borderBottomColor: bgColor }]} />
          )}
        </Animated.View>
      )}

      {/* Trigger */}
      <Pressable
        onPress={trigger === "press" ? (visible ? hide : show) : undefined}
        onLongPress={trigger === "longPress" ? show : undefined}
        onPressOut={trigger === "longPress" ? hide : undefined}
        delayLongPress={300}
      >
        {children}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
  },
  bubble: {
    position:       "absolute",
    left:           "50%",
    zIndex:         100,
    alignItems:     "center",
    transform:      [{ translateX: -60 }], // rough centering; refine with onLayout if needed
  },
  bubbleTop: {
    bottom: "100%",
    marginBottom: GAP,
    flexDirection: "column-reverse",
  },
  bubbleBottom: {
    top: "100%",
    marginTop: GAP,
    flexDirection: "column",
  },
  label: {
    borderRadius:      6,
    paddingHorizontal: 10,
    paddingVertical:   6,
    maxWidth:          200,
  },
  text: {
    fontFamily:    fonts.ui.regular,
    fontSize:      10,
    letterSpacing: 1,
    lineHeight:    16,
  },
  caretDown: {
    width:            0,
    height:           0,
    borderLeftWidth:  CARET,
    borderRightWidth: CARET,
    borderTopWidth:   CARET,
    borderLeftColor:  "transparent",
    borderRightColor: "transparent",
  },
  caretUp: {
    width:              0,
    height:             0,
    borderLeftWidth:    CARET,
    borderRightWidth:   CARET,
    borderBottomWidth:  CARET,
    borderLeftColor:    "transparent",
    borderRightColor:   "transparent",
  },
});
