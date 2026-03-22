/**
 * Banner.js
 * ─────────────────────────────────────────────────────────────
 * Full-width promotional strip with manga screen-tone dot texture.
 *
 * Props:
 *   eyebrow     string
 *   title       string — use \n for line breaks
 *   subtitle    string
 *   actionLabel string
 *   onAction    () => void
 *   variant     "dark"|"brand"   default: "dark"
 */

import { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb, withOpacity } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";
import { typeBase } from "@typography/scale";

// ── Dot screen texture ────────────────────────────────────────────────────────
const DOT_SIZE    = 1;
const DOT_SPACING = 6;
const DOT_OPACITY = 0.08;

const DotScreen = memo(function DotScreen({ width, height }) {
  if (!width || !height) return null;

  const cols = Math.ceil(width  / DOT_SPACING) + 1;
  const rows = Math.ceil(height / DOT_SPACING) + 1;
  const dots = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(
        <View
          key={`${r}-${c}`}
          style={{
            position:        "absolute",
            width:           DOT_SIZE,
            height:          DOT_SIZE,
            borderRadius:    DOT_SIZE / 2,
            backgroundColor: "rgb(255, 255, 255)",
            opacity:         DOT_OPACITY,
            top:             r * DOT_SPACING,
            left:            c * DOT_SPACING,
          }}
        />
      );
    }
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {dots}
    </View>
  );
});

// ── Banner ────────────────────────────────────────────────────────────────────

export default function Banner({
  eyebrow,
  title,
  subtitle,
  actionLabel,
  onAction,
  variant = "dark",
}) {
  const tokens = useColors();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const isDark = variant === "dark";

  const bgColor     = rgb(isDark ? tokens["--surface-brand-primary"]  : tokens["--surface-accent-primary"]);
  const borderColor = rgb(isDark ? tokens["--border-brand-primary"]  : tokens["--border-accent-secondary"]);
  const onFilled    = tokens["--shared-text-on-filled"];

  return (
    <View
      style={[s.container, { backgroundColor: bgColor, borderColor }]}
      onLayout={({ nativeEvent: { layout } }) =>
        setDimensions({ width: layout.width, height: layout.height })
      }
    >
      <DotScreen width={dimensions.width} height={dimensions.height} />

      <View style={s.row}>
        {/* Left — text stack */}
        <View style={s.textStack}>
          {eyebrow && (
            <Text style={[s.eyebrow, { color: withOpacity(onFilled, 0.5) }]}>
              {eyebrow}
            </Text>
          )}
          <Text style={[typeBase.h3, s.title, { color: rgb(onFilled) }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[s.subtitle, { color: withOpacity(onFilled, 0.6) }]}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right — CTA */}
        {actionLabel && (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={({ pressed }) => [
              s.cta,
              { backgroundColor: rgb(tokens["--base-canvas"]) },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[s.ctaLabel, { color: rgb(tokens["--text-neutral-primary"]) }]}>
              {actionLabel.toUpperCase()}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth:  1.5,
    overflow:     "hidden",
  },
  row: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical:   14,
    gap:            12,
  },
  textStack: {
    flex: 1,
    gap:  4,
  },
  eyebrow: {
    fontFamily:    fonts.ui.bold,
    fontSize:      9,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  title: {
    fontFamily:    fonts.special.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.ui.regular,
    fontSize:   11,
    marginTop:  2,
  },
  cta: {
    flexShrink:        0,
    borderRadius:      6,
    paddingHorizontal: 14,
    paddingVertical:   8,
  },
  ctaLabel: {
    fontFamily:    fonts.ui.bold,
    fontSize:      10,
    letterSpacing: 0.5,
  },
});
