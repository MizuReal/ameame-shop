/**
 * Accordion.js
 * ─────────────────────────────────────────────────────────────
 * Expandable/collapsible content section with animated height.
 * Not in the HTML refs — built from system conventions.
 *
 * Props:
 *   title       string | ReactNode — header content
 *   children    ReactNode — collapsed body content
 *   defaultOpen boolean   default: false
 *   controlled  { open: boolean, onToggle: () => void } — optional controlled mode
 *   divider     boolean   default: true — bottom border on each item
 *
 * Usage:
 *   // Uncontrolled
 *   <Accordion title="Order Details">
 *     <Text>Content here</Text>
 *   </Accordion>
 *
 *   // Controlled (e.g. only one open at a time)
 *   <Accordion
 *     title="Shipping"
 *     controlled={{ open: openId === "shipping", onToggle: () => setOpenId("shipping") }}
 *   >
 *     <ShippingDetails />
 *   </Accordion>
 */

import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

export default function Accordion({
  title,
  children,
  defaultOpen = false,
  controlled,
  divider     = true,
  bodyOverflowVisible = false,
  style,
}) {
  const tokens = useColors();

  const isControlled = controlled !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isControlled ? controlled.open : internalOpen;

  const toggle = () => {
    if (isControlled) {
      controlled.onToggle();
    } else {
      setInternalOpen(v => !v);
    }
  };

  // ── Animated height ────────────────────────────────────────────────────────
  const animHeight  = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;
  const [contentH, setContentH] = useState(0);
  const [isFullyOpen, setIsFullyOpen] = useState(defaultOpen);

  useEffect(() => {
    if (open) {
      Animated.timing(animHeight, {
        toValue:         1,
        duration:        220,
        useNativeDriver: false,
      }).start(() => setIsFullyOpen(true));
    } else {
      setIsFullyOpen(false);
      Animated.timing(animHeight, {
        toValue:         0,
        duration:        220,
        useNativeDriver: false,
      }).start();
    }
  }, [open, animHeight]);

  const heightInterpolated = animHeight.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, contentH],
  });

  const caretRotation = animHeight.interpolate({
    inputRange:  [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const shouldClip = !bodyOverflowVisible || !isFullyOpen;

  return (
    <View style={[
      s.container,
      shouldClip && s.containerClip,
      divider && { borderBottomWidth: 1, borderBottomColor: rgb(tokens["--border-neutral-weak"]) },
      style,
    ]}>
      {/* Header */}
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [s.header, pressed && { opacity: 0.7 }]}
      >
        {typeof title === "string" ? (
          <Text style={[s.title, { color: rgb(tokens["--text-neutral-primary"]) }]}>
            {title}
          </Text>
        ) : (
          <View style={s.titleSlot}>{title}</View>
        )}

        {/* Caret */}
        <Animated.Text style={[
          s.caret,
          { color: rgb(tokens["--text-neutral-tertiary"]), transform: [{ rotate: caretRotation }] },
        ]}>
          ▼
        </Animated.Text>
      </Pressable>

      {/* Animated body */}
      <Animated.View style={[s.bodyWrap, shouldClip && s.bodyWrapClip, { height: heightInterpolated }]}>
        <View
          style={s.bodyInner}
          onLayout={({ nativeEvent }) => setContentH(nativeEvent.layout.height)}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {},
  containerClip: {
    overflow: "hidden",
  },
  header: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingVertical:   14,
  },
  title: {
    fontFamily: fonts.ui.medium,
    fontSize:   14,
    flex:       1,
  },
  titleSlot: {
    flex: 1,
  },
  caret: {
    fontFamily: fonts.ui.regular,
    fontSize:   9,
    marginLeft: 12,
    marginRight: 8,
    flexShrink: 0,
  },
  bodyWrap: {},
  bodyWrapClip: {
    overflow: "hidden",
  },
  bodyInner: {
    position: "absolute",
    left:     0,
    right:    0,
    bottom:   0,
    paddingBottom: 14,
  },
});
