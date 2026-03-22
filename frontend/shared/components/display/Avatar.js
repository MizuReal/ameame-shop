/**
 * Avatar.js
 * ─────────────────────────────────────────────────────────────
 * Square avatar with initials, optional image, and status indicator.
 *
 * Props:
 *   initials      string
 *   size          "sm"|"md"|"lg"   default: "md"
 *   colorScheme   "a"|"b"|"c"|"d"|"neutral"|"dark"   default: "neutral"
 *   status        "online"|"away"|"offline"|null
 *   statusStyle   "dot"|"bar"   default: "dot"
 *   image         string — URI
 */

import { Image, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

const SIZE_MAP = {
  sm: { dimension: 32, fontSize: 11, dotSize: 8  },
  md: { dimension: 40, fontSize: 14, dotSize: 9  },
  lg: { dimension: 52, fontSize: 18, dotSize: 10 },
};

export default function Avatar({
  initials,
  size        = "md",
  colorScheme = "neutral",
  status      = null,
  statusStyle = "dot",
  image,
}) {
  const tokens = useColors();
  const sz     = SIZE_MAP[size] ?? SIZE_MAP.md;

  // ── Color scheme ────────────────────────────────────────────────────────────
  const schemeStyle = {
    a:       { bg: tokens["--surface-brand-secondary"],       text: tokens["--text-brand-primary"],       border: tokens["--border-brand-secondary"] },
    b:       { bg: tokens["--surface-information-secondary"], text: tokens["--text-information-primary"], border: tokens["--border-information-secondary"] },
    c:       { bg: tokens["--surface-success-secondary"],     text: tokens["--text-success-primary"],     border: tokens["--border-success-secondary"] },
    d:       { bg: tokens["--surface-warning-secondary"],     text: tokens["--text-warning-primary"],     border: tokens["--border-warning-secondary"] },
    neutral: { bg: tokens["--surface-neutral-primary"],       text: tokens["--text-neutral-primary"],     border: tokens["--border-neutral-secondary"] },
    dark:    { bg: tokens["--surface-neutral-strong"],        text: tokens["--text-neutral-inverted"],    border: null },
  }[colorScheme] ?? { bg: tokens["--surface-neutral-primary"], text: tokens["--text-neutral-primary"], border: tokens["--border-neutral-secondary"] };

  // ── Status dot color ────────────────────────────────────────────────────────
  const dotBg = {
    online:  tokens["--surface-success-primary"],
    away:    tokens["--surface-warning-primary"],
    offline: tokens["--surface-neutral-secondary"],
  }[status];

  // ── Status bar color ────────────────────────────────────────────────────────
  const barBg = {
    online:  tokens["--surface-neutral-strong"],
    away:    tokens["--surface-warning-primary"],
    offline: tokens["--border-neutral-secondary"],
  }[status];

  const showDot = status && statusStyle === "dot";
  const showBar = status && statusStyle === "bar";

  return (
    <View style={s.row}>
      {showBar && (
        <View style={[
          s.bar,
          { backgroundColor: rgb(barBg) },
          // Away: dashed effect via alternating opacity segments isn't natively
          // possible on a View — use reduced opacity as a visual indicator
          status === "away" && { opacity: 0.5 },
        ]} />
      )}

      {/* Tile */}
      <View style={[
        s.tile,
        {
          width:           sz.dimension,
          height:          sz.dimension,
          backgroundColor: rgb(schemeStyle.bg),
          borderColor:     schemeStyle.border ? rgb(schemeStyle.border) : "transparent",
          borderWidth:     schemeStyle.border ? 1 : 0,
        },
      ]}>
        {image ? (
          <Image
            source={{ uri: image }}
            style={{ width: sz.dimension, height: sz.dimension }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{
            fontFamily: fonts.special.bold,
            fontSize:   sz.fontSize,
            color:      rgb(schemeStyle.text),
          }}>
            {initials}
          </Text>
        )}

        {showDot && (
          <View style={[
            s.dot,
            {
              width:       sz.dotSize,
              height:      sz.dotSize,
              borderRadius: sz.dotSize / 2,
              backgroundColor: rgb(dotBg),
              borderColor:     rgb(tokens["--base-canvas"]),
            },
          ]} />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems:    "center",
  },
  bar: {
    width:        2,
    height:       28,
    borderRadius: 2,
    marginRight:  12,
  },
  tile: {
    borderRadius: 6,
    alignItems:   "center",
    justifyContent: "center",
    overflow:     "hidden",
  },
  dot: {
    position:    "absolute",
    bottom:      -2,
    right:       -2,
    borderWidth: 2,
  },
});
