/**
 * ReviewCard.js
 * ─────────────────────────────────────────────────────────────
 * Customer review row with star rating, author, date, and body.
 *
 * Props:
 *   author    string
 *   rating    number — 0–5, supports half stars
 *   date      string
 *   body      string
 *   verified  boolean
 *   rightSlot ReactNode
 */

import { StyleSheet, Text, View } from "react-native";
import { StarIcon } from "phosphor-react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";
import Badge from "./Badge";

function Stars({ rating, tokens }) {
  return (
    <View style={s.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = rating >= n;
        const half = !active && rating >= n - 0.5;
        return (
          <StarIcon
            key={n}
            size={12}
            weight={active || half ? "fill" : "regular"}
            color={"rgb(255, 223, 0)"}
            style={{ opacity: active ? 1 : half ? 0.6 : 0.2 }}
          />
        );
      })}
      <Text style={[s.ratingNum, { color: "rgb(255, 223, 0)" }]}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
}

export default function ReviewCard({
  author,
  rating   = 5,
  date,
  body,
  verified = false,
  rightSlot,
}) {
  const tokens = useColors();

  return (
    <View style={[s.container, { borderBottomColor: rgb(tokens["--border-neutral-weak"]) }]}>
      {/* Top row */}
      <View style={s.topRow}>
        <View style={s.authorRow}>
          <Text style={[s.author, { color: rgb(tokens["--text-neutral-primary"]) }]}>
            {author}
          </Text>
          {verified && <Badge label="Verified" variant="success" size="sm" />}
        </View>
        <View style={s.metaRight}>
          {date && (
            <Text style={[s.date, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
              {date}
            </Text>
          )}
          {rightSlot}
        </View>
      </View>

      <Stars rating={rating} tokens={tokens} />

      {body && (
        <Text style={[s.body, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
          {body}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingVertical:  16,
    borderBottomWidth: 1,
    gap:              8,
  },
  topRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  authorRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  metaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  author: {
    fontFamily: fonts.ui.bold,
    fontSize:   13,
  },
  date: {
    fontFamily: fonts.ui.regular,
    fontSize:   11,
  },
  starsRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           2,
  },
  ratingNum: {
    fontFamily: fonts.ui.bold,
    fontSize:   11,
    marginLeft: 4,
  },
  body: {
    fontFamily:  fonts.ui.regular,
    fontSize:    13,
    lineHeight:  13 * 1.6,
  },
});
