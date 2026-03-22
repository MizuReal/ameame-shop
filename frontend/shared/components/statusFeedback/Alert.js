/**
 * Alert.js
 * ─────────────────────────────────────────────────────────────
 * Inline status message with icon, title, and body text.
 *
 * Design refs:
 *   manga_ecommerce_mobile_ui  — .alert, .alert-err, .alert-info, .alert-ok
 *                                icon box 24×24 · title + body · border
 *   manga_ui_rounded_corners   — .mn-alert, .mn-alert-icon, .mn-alert-title
 *                                rule-thin border · serif icon font
 *
 * Props:
 *   variant   "error" | "info" | "success" | "warning"   default: "info"
 *   title     string
 *   body      string
 *   icon      ReactNode — custom icon (defaults to variant symbol)
 *   onClose   () => void — shows × dismiss button if provided
 *
 * Usage:
 *   <Alert variant="error"   title="Payment Failed"  body="カードが拒否されました。" />
 *   <Alert variant="success" title="Delivered"       body="配達が完了しました。" />
 *   <Alert variant="info"    title="Order Placed"    body="Your order is being prepared." />
 *   <Alert variant="warning" title="Low Stock"       body="Only 2 items remaining." onClose={dismiss} />
 */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb, withOpacity } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

// Default icon symbols per variant
const DEFAULT_ICON = {
  error:   "!",
  info:    "i",
  success: "✓",
  warning: "!",
};

export default function Alert({
  variant  = "info",
  title,
  body,
  icon,
  onClose,
}) {
  const tokens = useColors();

  // ── Token mapping per variant ───────────────────────────────────────────────
  const VARIANT = {
    error: {
      bg:         tokens["--surface-error-secondary"],
      border:     tokens["--border-error-secondary"],
      iconBg:     tokens["--surface-error-primary"],
      iconColor:  tokens["--shared-text-on-filled"],
      titleColor: tokens["--text-error-primary"],
      bodyColor:  tokens["--text-neutral-secondary"],
    },
    info: {
      bg:         tokens["--surface-information-secondary"],
      border:     tokens["--border-information-secondary"],
      iconBg:     tokens["--surface-information-primary"],
      iconColor:  tokens["--shared-text-on-filled"],
      titleColor: tokens["--text-information-primary"],
      bodyColor:  tokens["--text-neutral-secondary"],
    },
    success: {
      bg:         tokens["--surface-success-secondary"],
      border:     tokens["--border-success-secondary"],
      iconBg:     tokens["--surface-success-primary"],
      iconColor:  tokens["--shared-text-on-filled"],
      titleColor: tokens["--text-success-primary"],
      bodyColor:  tokens["--text-neutral-secondary"],
    },
    warning: {
      bg:         tokens["--surface-warning-secondary"],
      border:     tokens["--border-warning-secondary"],
      iconBg:     tokens["--surface-warning-primary"],
      iconColor:  tokens["--shared-text-on-filled"],
      titleColor: tokens["--text-warning-primary"],
      bodyColor:  tokens["--text-neutral-secondary"],
    },
  }[variant] ?? {};

  const iconSymbol = icon ?? DEFAULT_ICON[variant];

  return (
    <View style={[
      s.container,
      {
        backgroundColor: rgb(VARIANT.bg),
        borderColor:     rgb(VARIANT.border),
      },
    ]}>
      {/* Icon box */}
      <View style={[s.iconBox, { backgroundColor: rgb(VARIANT.iconBg) }]}>
        {typeof iconSymbol === "string" ? (
          <Text style={[s.iconText, { color: rgb(VARIANT.iconColor) }]}>
            {iconSymbol}
          </Text>
        ) : iconSymbol}
      </View>

      {/* Text */}
      <View style={s.textBlock}>
        {title && (
          <Text style={[s.title, { color: rgb(VARIANT.titleColor) }]}>
            {title}
          </Text>
        )}
        {body && (
          <Text style={[s.body, { color: rgb(VARIANT.bodyColor) }]}>
            {body}
          </Text>
        )}
      </View>

      {/* Dismiss */}
      {onClose && (
        <Pressable
          onPress={onClose}
          accessibilityLabel="Dismiss"
          style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={[s.closeBtnLabel, { color: rgb(VARIANT.titleColor) }]}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           12,
    padding:       13,
    borderRadius:  6,
    borderWidth:   1,
    marginBottom:  8,
  },
  iconBox: {
    width:          24,
    height:         24,
    borderRadius:   6,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  iconText: {
    fontFamily:  fonts.special.bold,
    fontSize:    11,
    lineHeight:  14,
  },
  textBlock: {
    flex: 1,
    gap:  2,
  },
  title: {
    fontFamily:  fonts.ui.bold,
    fontSize:    12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  body: {
    fontFamily: fonts.ui.regular,
    fontSize:   11,
    lineHeight: 11 * 1.5,
  },
  closeBtn: {
    padding:    4,
    flexShrink: 0,
  },
  closeBtnLabel: {
    fontFamily: fonts.ui.bold,
    fontSize:   11,
  },
});
