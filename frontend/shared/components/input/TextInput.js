/**
 * TextInput.js
 * ─────────────────────────────────────────────────────────────
 * Labeled text field with hint, error, and required indicator.
 *
 * Props:
 *   label         string
 *   required      boolean
 *   requiredLabel string | ReactNode
 *   placeholder   string
 *   value         string
 *   onChangeText  (text: string) => void
 *   error         string — triggers error border + message
 *   hint          string — shown below when no error
 *   disabled      boolean
 *   secureText    boolean
 *   keyboardType  KeyboardTypeOptions
 *   autoCapitalize "none"|"sentences"|"words"|"characters"
 *   multiline     boolean
 *   numberOfLines number    default: 4
 *   rightSlot     ReactNode
 */

import { forwardRef, useState } from "react";
import { StyleSheet, Text, TextInput as RNTextInput, View } from "react-native";
import { AsteriskIcon } from "phosphor-react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

const TextInput = forwardRef(function TextInput({
  label,
  required      = false,
  requiredLabel,
  placeholder,
  value,
  onChangeText,
  error,
  hint,
  disabled      = false,
  secureText    = false,
  keyboardType,
  autoCapitalize,
  multiline     = false,
  numberOfLines = 4,
  rightSlot,
}, ref) {
  const tokens  = useColors();
  const [focused, setFocused] = useState(false);

  // ── Border color — width stays 1.5px always to prevent layout shift ─────────
  const borderColor = disabled
    ? rgb(tokens["--border-neutral-primary-disabled"])
    : error
    ? rgb(tokens["--border-error-primary"])
    : focused
    ? rgb(tokens["--border-neutral-primary"])
    : rgb(tokens["--border-neutral-secondary"]);

  const bgColor = error
    ? rgb(tokens["--surface-error-secondary"])
    : rgb(tokens["--base-canvas"]);

  const requiredIndicator =
    requiredLabel ?? (
      <AsteriskIcon size={10} weight="bold" color={rgb(tokens["--text-error-primary"])} />
    );

  return (
    <View style={s.container}>

      {/* Label row */}
      {label && (
        <View style={s.labelRow}>
          <Text style={[s.label, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
            {label.toUpperCase()}
          </Text>
          {required && (
            <View style={[s.requiredBadge, { backgroundColor: rgb(tokens["--surface-error-secondary"]) }]}>
              {typeof requiredIndicator === "string" ? (
                <Text style={[s.requiredText, { color: rgb(tokens["--text-error-primary"]) }]}>
                  {requiredIndicator}
                </Text>
              ) : (
                requiredIndicator
              )}
            </View>
          )}
        </View>
      )}

      {/* Input wrapper */}
      <View style={[s.inputWrap, { borderColor, backgroundColor: bgColor }]}>
        <RNTextInput
          ref={ref}
          style={[
            s.input,
            { color: rgb(tokens["--text-neutral-primary"]) },
            disabled && { opacity: 0.5 },
          ]}
          placeholder={placeholder}
          placeholderTextColor={rgb(tokens["--shared-placeholder"])}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={!disabled}
          secureTextEntry={secureText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          textAlignVertical={multiline ? "top" : "center"}
        />
        {rightSlot && (
          <View style={s.rightSlot}>{rightSlot}</View>
        )}
      </View>

      {/* Below-field message */}
      {error ? (
        <Text style={[s.message, { color: rgb(tokens["--text-error-primary"]) }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[s.message, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
          {hint}
        </Text>
      ) : null}

    </View>
  );
});

export default TextInput;

const s = StyleSheet.create({
  container: {
    gap: 6,
  },
  labelRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  label: {
    fontFamily:    fonts.ui.bold,
    fontSize:      10,
    letterSpacing: 2,
  },
  requiredBadge: {
    paddingHorizontal: 6,
    paddingVertical:   1,
    borderRadius:      4,
  },
  requiredText: {
    fontFamily:    fonts.ui.bold,
    fontSize:      8,
    letterSpacing: 1,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems:    "center",
    borderRadius:  6,
    borderWidth:   1.5,
  },
  input: {
    flex:              1,
    fontFamily:        fonts.ui.regular,
    fontSize:          13,
    paddingHorizontal: 14,
    paddingVertical:   13,
  },
  rightSlot: {
    paddingRight: 12,
    paddingLeft:  4,
  },
  message: {
    fontFamily:    fonts.ui.medium,
    fontSize:      11,
    letterSpacing: 0.5,
  },
});
