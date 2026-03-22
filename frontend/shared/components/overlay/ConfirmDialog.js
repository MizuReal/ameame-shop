/**
 * ConfirmDialog.js
 * ─────────────────────────────────────────────────────────────
 * Confirmation modal with title, body text, and two action buttons.
 * Wraps Modal with the dialog-specific layout from both HTML refs.
 *
 * Design refs:
 *   manga_ecommerce_mobile_ui  — .dialog, .dialog-hd, .dialog-body,
 *                                .dialog-foot, .dbtn, .dbtn-cancel, .dbtn-del
 *   manga_ui_rounded_corners   — .mn-dialog, .mn-dialog-header,
 *                                .mn-dialog-body, .mn-dialog-footer
 *
 * Props:
 *   visible       boolean
 *   onClose       () => void — cancel / dismiss
 *   onConfirm     () => void — confirm action
 *   title         string
 *   body          string
 *   confirmLabel  string   default: "Confirm"
 *   cancelLabel   string   default: "Cancel"
 *   variant       "default" | "danger"   default: "default"
 *                 danger → confirm button uses error/accent surface
 *   loading       boolean — disables buttons, shows spinner on confirm
 *
 * Usage:
 *   <ConfirmDialog
 *     visible={showConfirm}
 *     onClose={() => setShowConfirm(false)}
 *     onConfirm={handleDelete}
 *     title="Remove Item?"
 *     body="「ポーター タンカー」をカートから削除してもよろしいですか？"
 *     confirmLabel="Remove"
 *     variant="danger"
 *   />
 */

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";
import Modal from "./Modal";

export default function ConfirmDialog({
  visible      = false,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  variant      = "default",
  loading      = false,
}) {
  const tokens = useColors();

  const confirmBg = variant === "danger"
    ? rgb(tokens["--surface-error-primary"])
    : rgb(tokens["--surface-brand-primary"]);

  const confirmColor = rgb(tokens["--shared-text-on-filled"]);

  return (
    <Modal visible={visible} onClose={onClose} width="md">

      {/* Header */}
      <View style={[s.header, { borderBottomColor: rgb(tokens["--border-neutral-weak"]) }]}>
        <Text style={[s.title, { color: rgb(tokens["--text-neutral-primary"]) }]}>
          {title}
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityLabel="Close"
          style={({ pressed }) => [
            s.closeBtn,
            { borderColor: rgb(tokens["--border-neutral-secondary"]) },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[s.closeBtnLabel, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
            ✕
          </Text>
        </Pressable>
      </View>

      {/* Body */}
      <View style={[s.body, { borderBottomColor: rgb(tokens["--border-neutral-weak"]) }]}>
        <Text style={[s.bodyText, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
          {body}
        </Text>
      </View>

      {/* Footer */}
      <View style={[s.footer, { backgroundColor: rgb(tokens["--surface-neutral-primary"]) }]}>
        {/* Cancel */}
        <Pressable
          onPress={onClose}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
          style={({ pressed }) => [
            s.btn,
            {
              backgroundColor: rgb(tokens["--base-canvas"]),
              borderColor:     rgb(tokens["--border-neutral-secondary"]),
            },
            pressed && { opacity: 0.75 },
          ]}
        >
          <Text style={[s.btnLabel, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
            {cancelLabel}
          </Text>
        </Pressable>

        {/* Confirm */}
        <Pressable
          onPress={!loading ? onConfirm : undefined}
          accessibilityRole="button"
          accessibilityLabel={confirmLabel}
          style={({ pressed }) => [
            s.btn,
            { backgroundColor: confirmBg, borderColor: confirmBg },
            pressed && !loading && { opacity: 0.8 },
          ]}
        >
          {loading
            ? <ActivityIndicator size="small" color={confirmColor} />
            : <Text style={[s.btnLabel, { color: confirmColor }]}>{confirmLabel}</Text>
          }
        </Pressable>
      </View>

    </Modal>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection:  "row",
    alignItems:     "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop:        18,
    paddingBottom:     14,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily:  fonts.special.bold,
    fontSize:    16,
    letterSpacing: -0.3,
    flex: 1,
    marginRight: 12,
  },
  closeBtn: {
    width:        22,
    height:       22,
    borderRadius: 4,
    borderWidth:  1,
    alignItems:   "center",
    justifyContent: "center",
  },
  closeBtnLabel: {
    fontFamily: fonts.ui.bold,
    fontSize:   10,
  },
  body: {
    paddingHorizontal: 18,
    paddingVertical:   14,
    borderBottomWidth: 1,
  },
  bodyText: {
    fontFamily: fonts.ui.regular,
    fontSize:   13,
    lineHeight: 13 * 1.7,
  },
  footer: {
    flexDirection:     "row",
    justifyContent:    "flex-end",
    gap:               8,
    paddingHorizontal: 18,
    paddingVertical:   12,
  },
  btn: {
    paddingHorizontal: 18,
    paddingVertical:   10,
    borderRadius:      6,
    borderWidth:       1.5,
    alignItems:        "center",
    justifyContent:    "center",
    minWidth:          80,
  },
  btnLabel: {
    fontFamily:    fonts.ui.bold,
    fontSize:      12,
    letterSpacing: 0.5,
  },
});
