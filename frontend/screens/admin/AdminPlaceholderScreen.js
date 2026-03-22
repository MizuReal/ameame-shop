import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import Card from "@components/layout/Card";
import Screen from "@components/layout/Screen";

export default function AdminPlaceholderScreen({
  title,
  description,
}) {
  const tokens = useColors();
  const type = useMemo(() => makeTypeStyles(tokens), [tokens]);

  return (
    <Screen
      edges={["left", "right"]}
      safeTop={false}
      scrollable
      contentContainerStyle={s.content}
    >
      <Text style={type.h2}>{title}</Text>
      <Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
        {description}
      </Text>

      <Card variant="outlined" radius="md" padding="md" style={s.card}>
        <Text style={type.body}>Placeholder Screen</Text>
        <Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
          This module is ready for CRUD/API wiring.
        </Text>
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 12,
  },
  card: {
    gap: 8,
  },
});
