import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb, withOpacity } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

export default function LoadingScreen({
  message,
  overlay = false,
}) {
  const tokens = useColors();

  const containerStyle = overlay
    ? [
        s.overlay,
        { backgroundColor: withOpacity(tokens["--base-canvas"], 0.85) },
      ]
    : [
        s.screen,
        { backgroundColor: rgb(tokens["--base-canvas"]) },
      ];

  return (
    <View style={containerStyle}>
      <View style={s.content}>
        <ActivityIndicator
          size="large"
          color={rgb(tokens["--text-neutral-primary"])}
        />
        {message && (
          <Text style={[s.message, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
            {message}
          </Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex:         50,
    alignItems:     "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    gap:        16,
  },
  message: {
    fontFamily:    fonts.ui.regular,
    fontSize:      13,
    letterSpacing: 0.5,
  },
});
