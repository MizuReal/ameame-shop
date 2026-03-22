/**
 * Popover.js
 * ─────────────────────────────────────────────────────────────
 * Small anchored tooltip-style overlay for contextual menus,
 * option lists, or rich hints.
 *
 * Design ref (manga_ui_rounded_corners — .tt-box, .tt-note):
 *   ink bg · rounded-md · small caret arrow pointing to anchor
 *   font-weight 300 · letter-spacing 1px
 *
 * Not a floating native overlay — renders absolutely positioned
 * within a relative container. The trigger and popover must share
 * a common positioned ancestor (wrap both in a View with relative).
 *
 * Props:
 *   visible     boolean
 *   onClose     () => void
 *   content     ReactNode — popover body content
 *   position    "top" | "bottom"   default: "top"
 *   align       "left" | "center" | "right"   default: "center"
 *   width       number   default: 200
 *   anchorOffset  number  default: 8 — gap between anchor and popover
 *
 * Usage:
 *   <View style={{ position: "relative" }}>
 *     <Popover
 *       visible={open}
 *       onClose={() => setOpen(false)}
 *       content={<Text>クリックで確定します</Text>}
 *       position="top"
 *     />
 *     <Button label="保存する" onPress={() => setOpen(true)} />
 *   </View>
 */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

const CARET_SIZE = 6;

export default function Popover({
  visible      = false,
  onClose,
  content,
  position     = "top",
  align        = "center",
  width        = 200,
  anchorOffset = 8,
}) {
  const tokens = useColors();

  if (!visible) return null;

  const isTop  = position === "top";
  const bgColor = rgb(tokens["--base-canvas"]);
  const textColor = rgb(tokens["--text-neutral-primary"]);

  // Horizontal alignment
  const alignStyle = {
    left:   { left: 0 },
    center: { alignSelf: "center" },
    right:  { right: 0 },
  }[align];

  // Position above or below anchor
  const positionStyle = isTop
    ? { bottom: "100%", marginBottom: anchorOffset }
    : { top: "100%",    marginTop:    anchorOffset };

  return (
    <Pressable
      style={[s.overlay, positionStyle, alignStyle, { width }]}
      onPress={() => {}} // absorb taps
    >
      {/* Panel */}
      <View
        style={[
          s.panel,
          {
            backgroundColor: bgColor,
            borderColor: rgb(tokens["--border-neutral-secondary"]),
          },
        ]}
      >
        {typeof content === "string" ? (
          <Text style={[s.text, { color: textColor }]}>{content}</Text>
        ) : (
          content
        )}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: "absolute",
    zIndex:   100,
  },
  panel: {
    borderRadius:      6,
    paddingHorizontal: 10,
    paddingVertical:   7,
    borderWidth:       1,
    shadowColor:       "#000",
    shadowOffset:      { width: 0, height: 6 },
    shadowOpacity:     0.15,
    shadowRadius:      10,
    elevation:         6,
  },
  text: {
    fontFamily:    fonts.ui.regular,
    fontSize:      10,
    letterSpacing: 1,
    lineHeight:    16,
  },
});
