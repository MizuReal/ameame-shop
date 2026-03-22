/**
 * Modal.js
 * ─────────────────────────────────────────────────────────────
 * Base modal sheet. Scrim backdrop + centered or bottom-anchored
 * content panel. Used directly or as the shell for ConfirmDialog,
 * ImageLightbox, and Popover.
 *
 * Design ref (manga_ecommerce_mobile_ui — .dialog-scene):
 *   rgba(14,14,14,0.45) scrim · white panel · ink border 1.5px
 *   rounded-xl · dot-screen texture on scrim (optional)
 *
 * Props:
 *   visible       boolean
 *   onClose       () => void — called on backdrop press or close gesture
 *   children      ReactNode — panel content
 *   position      "center" | "bottom"   default: "center"
 *   width         "sm" | "md" | "full"  default: "md"
 *                 sm   = 280px
 *                 md   = 340px
 *                 full = 100% (bottom sheet)
 *   closable      boolean   default: true — backdrop tap closes
 *   showHandle    boolean   default: false — bottom sheet drag handle
 *   style         ViewStyle — panel style overrides
 *
 * Usage:
 *   <Modal visible={open} onClose={() => setOpen(false)}>
 *     <Text>Modal content</Text>
 *   </Modal>
 *
 *   <Modal visible={open} onClose={onClose} position="bottom" width="full" showHandle>
 *     <FilterSheet />
 *   </Modal>
 */

import { Modal as RNModal, Pressable, StyleSheet, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb, withOpacity } from "@shared/styles/styleUtils";

export default function Modal({
  visible   = false,
  onClose,
  children,
  position  = "center",
  width     = "md",
  closable  = true,
  showHandle = false,
  style,
}) {
  const tokens = useColors();

  const panelWidth = { sm: 280, md: 340, full: "100%" }[width] ?? 340;

  const isBottom = position === "bottom";

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={isBottom ? "slide" : "fade"}
      statusBarTranslucent
      onRequestClose={closable ? onClose : undefined}
    >
      {/* Scrim */}
      <Pressable
        style={[s.scrim, { backgroundColor: withOpacity(tokens["--base-foreground"], 0.45) }]}
        onPress={closable ? onClose : undefined}
      >
        {/* Panel — stop press events propagating to scrim */}
        <Pressable
          style={[
            s.panel,
            isBottom ? s.panelBottom : s.panelCenter,
            {
              width:           panelWidth,
              backgroundColor: rgb(tokens["--base-canvas"]),
              borderColor:     rgb(tokens["--border-neutral-primary"]),
            },
            style,
          ]}
          onPress={() => {}} // absorb taps
        >
          {showHandle && (
            <View style={[s.handle, { backgroundColor: rgb(tokens["--border-neutral-secondary"]) }]} />
          )}
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const s = StyleSheet.create({
  scrim: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
  },
  panel: {
    borderRadius: 12,
    borderWidth:  1.5,
    overflow:     "hidden",
  },
  panelCenter: {
    // centered — default
  },
  panelBottom: {
    position:      "absolute",
    bottom:        0,
    left:          0,
    right:         0,
    borderRadius:  0,
    borderTopLeftRadius:  16,
    borderTopRightRadius: 16,
    borderBottomWidth:    0,
    borderLeftWidth:      0,
    borderRightWidth:     0,
  },
  handle: {
    width:        40,
    height:       4,
    borderRadius: 2,
    alignSelf:    "center",
    marginTop:    12,
    marginBottom: 4,
  },
});
