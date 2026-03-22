/**
 * Toast.js
 * ─────────────────────────────────────────────────────────────
 * Transient notification that appears briefly then auto-dismisses.
 * Renders at the top or bottom of the screen as an absolute overlay.
 * Not in the HTML refs — built from the Alert visual language.
 *
 * Meant to be used with a toast manager (e.g. a global state slice
 * or a simple imperative ref). See usage example below.
 *
 * Props:
 *   visible     boolean
 *   onHide      () => void — called after auto-dismiss or manual close
 *   message     string
 *   variant     "neutral" | "success" | "error" | "warning"   default: "neutral"
 *   duration    number   default: 3000ms
 *   position    "top" | "bottom"   default: "bottom"
 *   icon        ReactNode — optional left icon
 *
 * Usage:
 *   const [toast, setToast] = useState({ visible: false, message: "" });
 *
 *   const showToast = (message, variant = "neutral") => {
 *     setToast({ visible: true, message, variant });
 *   };
 *
 *   <Toast
 *     visible={toast.visible}
 *     message={toast.message}
 *     variant={toast.variant}
 *     onHide={() => setToast(t => ({ ...t, visible: false }))}
 *   />
 */

import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

export default function Toast({
  visible  = false,
  onHide,
  message,
  variant  = "neutral",
  duration = 3000,
  position = "bottom",
  icon,
}) {
  const tokens   = useColors();
  const opacity  = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(position === "top" ? -20 : 20)).current;

  useEffect(() => {
    if (visible) {
      // Slide in + fade in
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();

      // Auto-dismiss
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity,     { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(translateY,  { toValue: position === "top" ? -20 : 20, duration: 200, useNativeDriver: true }),
        ]).start(() => onHide?.());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide, opacity, position, translateY]);

  if (!visible) return null;

  // ── Token mapping ─────────────────────────────────────────────────────────
  const VARIANT = {
    neutral: {
      bg:     tokens["--surface-neutral-strong"],
      text:   tokens["--text-neutral-inverted"],
      border: tokens["--border-neutral-primary"],
    },
    success: {
      bg:     tokens["--surface-success-primary"],
      text:   tokens["--shared-text-on-filled"],
      border: tokens["--border-success-primary"],
    },
    error: {
      bg:     tokens["--surface-error-primary"],
      text:   tokens["--shared-text-on-filled"],
      border: tokens["--border-error-primary"],
    },
    warning: {
      bg:     tokens["--surface-warning-primary"],
      text:   tokens["--shared-text-on-filled"],
      border: tokens["--border-warning-primary"],
    },
  }[variant] ?? {};

  const positionStyle = position === "top"
    ? { top: 60 }
    : { bottom: 80 };

  return (
    <Animated.View
      style={[
        s.container,
        positionStyle,
        { opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <View style={[
        s.pill,
        {
          backgroundColor: rgb(VARIANT.bg),
          borderColor:     rgb(VARIANT.border),
        },
      ]}>
        {icon && <View style={s.iconWrap}>{icon}</View>}
        <Text style={[s.message, { color: rgb(VARIANT.text) }]}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position:       "absolute",
    left:           0,
    right:          0,
    alignItems:     "center",
    zIndex:         999,
    pointerEvents:  "none",
  },
  pill: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               8,
    paddingHorizontal: 18,
    paddingVertical:   12,
    borderRadius:      24,
    borderWidth:       1,
    maxWidth:          320,
    shadowColor:       "#000",
    shadowOpacity:     0.15,
    shadowRadius:      12,
    shadowOffset:      { width: 0, height: 4 },
    elevation:         6,
  },
  iconWrap: {
    flexShrink: 0,
  },
  message: {
    fontFamily:  fonts.ui.medium,
    fontSize:    13,
    letterSpacing: 0.2,
    flexShrink:  1,
  },
});
