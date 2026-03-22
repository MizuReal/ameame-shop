/**
 * ToggleSwitch.js
 * ─────────────────────────────────────────────────────────────
 * Labelled on/off toggle. Controlled component.
 * Animated thumb slides left↔right; ink fill fades in on the track.
 *
 * Props:
 *   value         boolean
 *   onValueChange (next: boolean) => void
 *   label         string
 *   sublabel      string
 *   disabled      boolean
 */

import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

const TRACK_W    = 44;
const TRACK_H    = 24;
const THUMB_SIZE = 18;
const THUMB_OFF  = 2;
const THUMB_ON   = TRACK_W - THUMB_SIZE - 4;

export default function ToggleSwitch({
  value         = false,
  onValueChange,
  label,
  sublabel,
  disabled      = false,
}) {
  const tokens = useColors();
  const anim   = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue:         value ? 1 : 0,
      duration:        200,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const thumbLeft  = anim.interpolate({ inputRange: [0, 1], outputRange: [THUMB_OFF, THUMB_ON] });
  const inkOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Pressable
      onPress={() => !disabled && onValueChange?.(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={({ pressed }) => [
        s.row,
        { borderBottomColor: rgb(tokens["--border-neutral-weak"]) },
        pressed && !disabled && { opacity: 0.7 },
      ]}
    >
      {/* Label stack */}
      {(label || sublabel) && (
        <View style={s.labelStack}>
          {label && (
            <Text style={[
              s.label,
              { color: rgb(disabled
                  ? tokens["--text-neutral-primary-disabled"]
                  : tokens["--text-neutral-primary"]) },
            ]}>
              {label}
            </Text>
          )}
          {sublabel && (
            <Text style={[s.sublabel, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
              {sublabel}
            </Text>
          )}
        </View>
      )}

      {/* Track */}
      <View style={[
        s.track,
        {
          backgroundColor: rgb(tokens["--surface-neutral-primary"]),
          borderColor:     rgb(tokens["--border-neutral-secondary"]),
        },
      ]}>
        {/* Ink fill overlay */}
        <Animated.View style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: rgb(tokens["--surface-accent-primary"]),
            opacity: disabled ? 0.4 : inkOpacity,
          },
        ]} />

        {/* Thumb */}
        <Animated.View style={[
          s.thumb,
          {
            left: thumbLeft,
            backgroundColor: disabled
              ? "rgb(210, 210, 210)"
              : "rgb(250, 250, 250)",
          },
        ]} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  labelStack: {
    flex:        1,
    marginRight: 16,
  },
  label: {
    fontFamily:  fonts.ui.medium,
    fontSize:    14,
    lineHeight:  19.6,
  },
  sublabel: {
    fontFamily:    fonts.ui.regular,
    fontSize:      11,
    letterSpacing: 1,
    marginTop:     2,
  },
  track: {
    width:        TRACK_W,
    height:       TRACK_H,
    borderRadius: 6,
    borderWidth:  1,
    overflow:     "hidden",
    flexShrink:   0,
  },
  thumb: {
    position:        "absolute",
    top:             THUMB_OFF,
    width:           THUMB_SIZE,
    height:          THUMB_SIZE,
    borderRadius:    4,
    backgroundColor: "rgb(250, 250, 250)",
    shadowColor:     "#000",
    shadowOpacity:   0.15,
    shadowRadius:    2,
    shadowOffset:    { width: 0, height: 1 },
    elevation:       2,
  },
});
