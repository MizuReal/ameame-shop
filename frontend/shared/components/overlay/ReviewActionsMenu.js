/**
 * ReviewActionsMenu.js
 * Small kebab menu for edit/delete review actions.
 */

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DotsThreeVerticalIcon } from "phosphor-react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";
import IconButton from "@components/action/IconButton";
import Popover from "./Popover";

export default function ReviewActionsMenu({
  onEdit,
  onDelete,
  size = "sm",
  align = "right",
}) {
  const tokens = useColors();
  const [open, setOpen] = useState(false);

  const iconColor = rgb(tokens["--icon-neutral-primary"]);

  const content = (
    <View style={s.menu}>
      <Pressable
        onPress={() => {
          setOpen(false);
          onEdit?.();
        }}
        style={({ pressed }) => [s.menuItem, pressed && { opacity: 0.7 }]}
      >
        <Text style={[s.menuLabel, { color: rgb(tokens["--text-neutral-primary"]) }]}>
          Edit review
        </Text>
      </Pressable>
      <Pressable
        onPress={() => {
          setOpen(false);
          onDelete?.();
        }}
        style={({ pressed }) => [s.menuItem, pressed && { opacity: 0.7 }]}
      >
        <Text style={[s.menuLabel, { color: rgb(tokens["--text-error-primary"]) }]}>
          Delete review
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={s.wrap}>
      <Popover visible={open} onClose={() => setOpen(false)} content={content} align={align} />
      <IconButton
        size={size}
        variant="ghost"
        icon={<DotsThreeVerticalIcon size={20} color={iconColor} />}
        onPress={() => setOpen((v) => !v)}
        accessibilityLabel="Review actions"
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "relative",
    alignSelf: "flex-start",
  },
  menu: {
    gap: 6,
  },
  menuItem: {
    paddingVertical: 6,
  },
  menuLabel: {
    fontFamily: fonts.ui.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
});
