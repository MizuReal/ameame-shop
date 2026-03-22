/**
 * Dropdown.js
 * ─────────────────────────────────────────────────────────────
 * Select / dropdown picker. Controlled component.
 * Menu position uses measured pixel height — no percentage strings.
 *
 * Props:
 *   options      { label: string, sublabel?: string, value: string }[]
 *   value        string
 *   onChange     (value: string) => void
 *   placeholder  string    default: "Select…"
 *   label        string
 *   disabled     boolean
 *   menuPosition "below"|"above"   default: "below"
 */

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

const MENU_GAP = 4;

export default function Dropdown({
  options      = [],
  value,
  onChange,
  placeholder  = "Select…",
  label,
  disabled     = false,
  menuPosition = "below",
}) {
  const tokens  = useColors();
  const [open,          setOpen]          = useState(false);
  const [triggerHeight, setTriggerHeight] = useState(0);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel   = selectedOption?.label ?? placeholder;
  const menuOffset     = triggerHeight + MENU_GAP;

  const handleSelect = (optValue) => {
    onChange?.(optValue);
    setOpen(false);
  };

  // Border color — width stays 1.5px to prevent layout shift
  const borderColor = rgb(disabled
    ? tokens["--border-neutral-primary-disabled"]
    : open
    ? tokens["--border-neutral-primary"]
    : tokens["--border-neutral-secondary"]);

  return (
    <View style={s.outerContainer}>

      {label && (
        <Text style={[s.label, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
          {label.toUpperCase()}
        </Text>
      )}

      {/* Wrapper elevates zIndex when open so menu overlaps siblings */}
      <View style={{ zIndex: open ? 50 : 1 }}>

        {/* Trigger */}
        <Pressable
          onLayout={(e) => setTriggerHeight(e.nativeEvent.layout.height)}
          onPress={() => !disabled && setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open, disabled }}
          accessibilityLabel={label}
          style={({ pressed }) => [
            s.trigger,
            {
              backgroundColor: rgb(tokens["--base-canvas"]),
              borderColor,
            },
            pressed && !disabled && { opacity: 0.8 },
          ]}
        >
          <Text style={[
            s.triggerLabel,
            { color: rgb(selectedOption
                ? tokens["--text-neutral-primary"]
                : tokens["--shared-placeholder"]) },
          ]}>
            {displayLabel}
          </Text>
          <Text style={[
            s.caret,
            { color: rgb(tokens["--text-neutral-tertiary"]),
              transform: [{ rotate: open ? "180deg" : "0deg" }] },
          ]}>
            ▼
          </Text>
        </Pressable>

        {/* Menu */}
        {open && (
          <View style={[
            s.menu,
            {
              backgroundColor: rgb(tokens["--base-canvas"]),
              borderColor:     rgb(tokens["--border-neutral-primary"]),
              ...(menuPosition === "above"
                ? { bottom: menuOffset }
                : { top:    menuOffset }),
            },
          ]}>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
              {options.map((opt, i) => {
                const isSelected = opt.value === value;
                const isLast     = i === options.length - 1;

                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => handleSelect(opt.value)}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      s.option,
                      !isLast && {
                        borderBottomWidth: 1,
                        borderBottomColor: rgb(tokens["--border-neutral-weak"]),
                      },
                      isSelected && { backgroundColor: rgb(tokens["--surface-neutral-primary"]) },
                      pressed && { backgroundColor: "rgba(128,128,128,0.06)" },
                    ]}
                  >
                    <View style={s.optionText}>
                      <Text style={[
                        s.optionLabel,
                        { color:      rgb(tokens["--text-neutral-primary"]),
                          fontFamily: isSelected ? fonts.ui.bold : fonts.ui.regular },
                      ]}>
                        {opt.label}
                      </Text>
                      {opt.sublabel && (
                        <Text style={[s.optionSublabel, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
                          {opt.sublabel}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <View style={[s.selectedDot, { backgroundColor: rgb(tokens["--base-foreground"]) }]} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outerContainer: {
    gap: 6,
  },
  label: {
    fontFamily:    fonts.ui.bold,
    fontSize:      10,
    letterSpacing: 2,
  },
  trigger: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    borderRadius:      6,
    borderWidth:       1.5,
    paddingHorizontal: 14,
    paddingVertical:   13,
  },
  triggerLabel: {
    fontFamily: fonts.ui.regular,
    fontSize:   14,
    flex:       1,
  },
  caret: {
    fontFamily: fonts.ui.regular,
    fontSize:   9,
    marginLeft: 8,
  },
  menu: {
    position:      "absolute",
    left:          0,
    right:         0,
    zIndex:        100,
    borderRadius:  6,
    borderWidth:   1.5,
    overflow:      "hidden",
    shadowColor:   "#000",
    shadowOpacity: 0.1,
    shadowRadius:  8,
    shadowOffset:  { width: 0, height: 4 },
    elevation:     8,
  },
  option: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 14,
    paddingVertical:   14,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize:      14,
    letterSpacing: 0.5,
  },
  optionSublabel: {
    fontFamily:    fonts.ui.regular,
    fontSize:      11,
    letterSpacing: 1,
    marginTop:     1,
  },
  selectedDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
    marginLeft:   12,
    flexShrink:   0,
  },
});
