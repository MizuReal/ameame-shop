import React from "react";
import { View, ScrollView, StyleSheet, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";

/**
 * Screen
 * Lightweight wrapper that standardizes safe-area behavior across screens.
 *
 * Props:
 *  - children
 *  - style          -> applied to outer container
 *  - contentContainerStyle -> applied to ScrollView contentContainerStyle when scrollable
 *  - backgroundColor
 *  - scrollable     -> boolean, renders a ScrollView when true
 *  - safeTop        -> boolean, include top safe inset (default: true)
 *  - safeBottom     -> boolean, include bottom safe inset (default: true)
 *  - edges         -> passed to SafeAreaView for legacy/explicit control
 *
 * Notes:
 *  - For non-overlay tab bar setups we keep safeBottom=true by default so
 *    content isn't flush to the system bottom and lists behave naturally.
 *  - For scrollable content we disable automatic iOS inset adjustments and
 *    manage padding manually via contentContainerStyle.
 */
export default function Screen({
  children,
  style,
  contentContainerStyle,
  backgroundColor,
  scrollable = false,
  safeTop = true,
  safeBottom = false,
  edges = [],
  scrollProps = {},
  ...props
}) {
  const tokens = useColors();
  const bg = backgroundColor ?? rgb(tokens["--base-canvas"]);
  const insets = useSafeAreaInsets();

  const paddingTop = safeTop ? insets.top : 0;
  const paddingBottom = safeBottom ? insets.bottom : 0;

  if (scrollable) {
    // Use a ScrollView and apply manual padding to contentContainerStyle.
    // Disable automatic content inset adjustment on iOS to prevent jumps.
    return (
      <SafeAreaView edges={edges} style={[s.safe, { backgroundColor: bg }, style]} {...props}>
        <ScrollView
          style={s.fill}
          contentContainerStyle={[
            { paddingTop, paddingBottom },
            contentContainerStyle,
          ]}
          // iOS-specific: prevent automatic adjustment which can cause jumps
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps={scrollProps.keyboardShouldPersistTaps ?? "handled"}
          keyboardDismissMode={scrollProps.keyboardDismissMode}
          showsVerticalScrollIndicator={scrollProps.showsVerticalScrollIndicator ?? false}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} style={[s.safe, { backgroundColor: bg }, style]} {...props}>
      <View style={[s.fill, { paddingTop, paddingBottom }]}>{children}</View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
});
