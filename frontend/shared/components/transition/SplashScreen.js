/**
 * SplashScreen.js
 * ─────────────────────────────────────────────────────────────
 * App launch screen shown while fonts and assets load.
 * Renders a branded full-screen surface with the app mark,
 * then fades out when onReady() is called.
 *
 * This is a visual component — the actual expo-splash-screen
 * hide logic lives in _layout.js (SplashScreen.hideAsync()).
 * Use this component for a custom animated transition after
 * the native splash has already hidden.
 *
 * Props:
 *   visible     boolean — controls fade out
 *   onHidden    () => void — called after fade-out completes
 *   logo        ReactNode — app logo / wordmark
 *   tagline     string — optional small text below logo
 *
 * Usage:
 *   // In your root layout, after fonts load:
 *   <SplashScreen
 *     visible={!fontsLoaded}
 *     onHidden={() => setShowSplash(false)}
 *     logo={<AppLogo />}
 *     tagline="市場"
 *   />
 */

import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

export default function SplashScreen({
  visible  = true,
  onHidden,
  logo,
  tagline,
}) {
  const tokens  = useColors();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      Animated.timing(opacity, {
        toValue:         0,
        duration:        400,
        useNativeDriver: true,
      }).start(() => onHidden?.());
    }
  }, [visible, onHidden, opacity]);

  return (
    <Animated.View
      style={[
        s.root,
        { backgroundColor: rgb(tokens["--base-canvas"]), opacity },
      ]}
      pointerEvents={visible ? "auto" : "none"}
    >
      {/* Dot texture — matches the manga screen-tone aesthetic */}
      <View style={s.dotOverlay} pointerEvents="none">
        {Array.from({ length: 20 }).map((_, r) =>
          Array.from({ length: 10 }).map((_, c) => (
            <View
              key={`${r}-${c}`}
              style={[
                s.dot,
                {
                  backgroundColor: rgb(tokens["--border-neutral-weak"]),
                  top:  r * 40,
                  left: c * 40,
                },
              ]}
            />
          ))
        )}
      </View>

      {/* Content */}
      <View style={s.content}>
        {logo && <View style={s.logoWrap}>{logo}</View>}
        {tagline && (
          <Text style={[s.tagline, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
            {tagline}
          </Text>
        )}
      </View>

      {/* Bottom mark */}
      <Text style={[s.bottomMark, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
        ameame
      </Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex:         999,
    alignItems:     "center",
    justifyContent: "center",
  },
  dotOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  dot: {
    position:     "absolute",
    width:        2,
    height:       2,
    borderRadius: 1,
    opacity:      0.4,
  },
  content: {
    alignItems: "center",
    gap:        16,
  },
  logoWrap: {
    alignItems: "center",
  },
  tagline: {
    fontFamily:    fonts.special.bold,
    fontSize:      14,
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  bottomMark: {
    position:      "absolute",
    bottom:        48,
    fontFamily:    fonts.ui.regular,
    fontSize:      10,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
});
