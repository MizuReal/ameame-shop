/**
 * SearchBar.js
 * ─────────────────────────────────────────────────────────────
 * Search input with optional leading icon, clear button, and filter button.
 *
 * Props:
 *   value         string
 *   onChangeText  (text: string) => void
 *   placeholder   string    default: "Search…"
 *   onSubmit      () => void
 *   onClear       () => void — shows × when value non-empty
 *   searchIcon    ReactNode — leading icon
 *   filterIcon    ReactNode — right filter button icon
 *   onFilter      () => void
 *   autoFocus     boolean
 *   showSoftInputOnFocus boolean
 *   onFocus       (event) => void
 *   editable      boolean
 */

import { forwardRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

const SearchBar = forwardRef(function SearchBar({
  value,
  onChangeText,
  placeholder = "Search…",
  onSubmit,
  onClear,
  searchIcon,
  filterIcon,
  onFilter,
  autoFocus   = false,
  showSoftInputOnFocus = true,
  onFocus,
  editable = true,
}, ref) {
  const tokens    = useColors();
  const [focused, setFocused] = useState(false);

  // Border color only changes on focus — width stays 1.5px always
  const borderColor = focused
    ? rgb(tokens["--border-neutral-primary"])
    : rgb(tokens["--border-neutral-secondary"]);

  const showClear = onClear && value && value.length > 0;

  return (
    <View style={[
      s.container,
      {
        backgroundColor: rgb(tokens["--surface-neutral-primary"]),
        borderColor,
      },
    ]}>
      {searchIcon && (
        <View style={s.searchIconWrap}>{searchIcon}</View>
      )}

      <TextInput
        ref={ref}
        style={[s.input, { color: rgb(tokens["--text-neutral-primary"]) }]}
        placeholder={placeholder}
        placeholderTextColor={rgb(tokens["--shared-placeholder"])}
        value={value}
        onChangeText={onChangeText}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoFocus={autoFocus}
        showSoftInputOnFocus={showSoftInputOnFocus}
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
      />

      {showClear && (
        <Pressable
          onPress={onClear}
          accessibilityLabel="Clear search"
          style={[s.clearBtn, { backgroundColor: rgb(tokens["--surface-neutral-secondary"]) }]}
        >
          <Text style={[s.clearText, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
            ✕
          </Text>
        </Pressable>
      )}

      {filterIcon && (
        <Pressable
          onPress={onFilter}
          accessibilityLabel="Filter"
          style={({ pressed }) => [
            s.filterBtn,
            {
              backgroundColor: rgb(tokens["--base-canvas"]),
              borderColor:     rgb(tokens["--border-neutral-secondary"]),
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          {filterIcon}
        </Pressable>
      )}
    </View>
  );
});

export default SearchBar;

const s = StyleSheet.create({
  container: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               10,
    borderRadius:      6,
    borderWidth:       1.5,
    paddingHorizontal: 14,
    paddingVertical:   11,
  },
  searchIconWrap: {
    width:          16,
    height:         16,
    flexShrink:     0,
    alignItems:     "center",
    justifyContent: "center",
  },
  input: {
    flex:       1,
    fontFamily: fonts.ui.regular,
    fontSize:   13,
    padding:    0,
  },
  clearBtn: {
    width:          20,
    height:         20,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  clearText: {
    fontFamily:  fonts.ui.bold,
    fontSize:    10,
    lineHeight:  12,
  },
  filterBtn: {
    width:        28,
    height:       28,
    borderRadius: 5,
    borderWidth:  1,
    alignItems:   "center",
    justifyContent: "center",
    flexShrink:   0,
  },
});
