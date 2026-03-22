/**
 * SkeletonCard.js
 * ─────────────────────────────────────────────────────────────
 * Animated placeholder card shown while content is loading.
 * Matches the product card dimensions from the ecommerce ref.
 *
 * Uses a shimmer animation — a bright overlay sweeps left to right
 * across the skeleton blocks using Animated.loop.
 *
 * Props:
 *   variant   "product" | "review" | "list-row" | "banner"
 *             default: "product"
 *             product  → 158px wide card with image area + text lines
 *             review   → full-width row with avatar + lines
 *             list-row → full-width row (settings, order item style)
 *             banner   → full-width tall strip
 *   width     number — override card width (product variant only)
 *   animated  boolean   default: true
 *
 * Usage:
 *   <SkeletonCard />
 *   <SkeletonCard variant="review" />
 *   <ScrollList
 *     data={loading ? Array(4).fill(null) : products}
 *     renderItem={({ item }) => item
 *       ? <ProductCard product={item} />
 *       : <SkeletonCard />
 *     }
 *   />
 */

import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";

// ── Shimmer block ─────────────────────────────────────────────────────────────
function Block({ width, height, radius = 4, shimmerOpacity, tokens }) {
  return (
    <View style={[
      s.block,
      {
        width,
        height,
        borderRadius:    radius,
        backgroundColor: rgb(tokens["--surface-neutral-primary"]),
        overflow:        "hidden",
      },
    ]}>
      <Animated.View style={[
        StyleSheet.absoluteFillObject,
        { backgroundColor: rgb(tokens["--surface-neutral-secondary"]), opacity: shimmerOpacity },
      ]} />
    </View>
  );
}

export default function SkeletonCard({
  variant  = "product",
  width    = 158,
  animated = true,
}) {
  const tokens       = useColors();
  const shimmerAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, shimmerAnim]);

  const shimmerOpacity = animated ? shimmerAnim : 0.4;

  const blockProps = { shimmerOpacity, tokens };

  if (variant === "product") {
    return (
      <View style={[
        s.productCard,
        {
          width,
          backgroundColor: rgb(tokens["--base-canvas"]),
          borderColor:     rgb(tokens["--border-neutral-secondary"]),
        },
      ]}>
        {/* Image area */}
        <Block width="100%" height={128} radius={0} {...blockProps} />
        {/* Info */}
        <View style={s.productInfo}>
          <Block width={60}  height={8}  {...blockProps} />
          <Block width="90%" height={10} {...blockProps} />
          <Block width="60%" height={10} {...blockProps} />
          <Block width={50}  height={14} {...blockProps} />
        </View>
      </View>
    );
  }

  if (variant === "review") {
    return (
      <View style={[s.reviewRow, { borderBottomColor: rgb(tokens["--border-neutral-weak"]) }]}>
        <View style={s.reviewLeft}>
          <Block width="70%" height={10} {...blockProps} />
          <Block width={80}  height={8}  {...blockProps} />
          <Block width="100%" height={9}  {...blockProps} />
          <Block width="85%"  height={9}  {...blockProps} />
        </View>
      </View>
    );
  }

  if (variant === "list-row") {
    return (
      <View style={[s.listRow, { borderBottomColor: rgb(tokens["--border-neutral-weak"]) }]}>
        <Block width={40}   height={40} radius={6} {...blockProps} />
        <View style={s.listText}>
          <Block width="60%" height={10} {...blockProps} />
          <Block width="40%" height={8}  {...blockProps} />
        </View>
      </View>
    );
  }

  if (variant === "banner") {
    return (
      <View style={[
        s.banner,
        {
          backgroundColor: rgb(tokens["--surface-neutral-primary"]),
          borderColor:     rgb(tokens["--border-neutral-secondary"]),
        },
      ]}>
        <View style={s.bannerLeft}>
          <Block width={60}  height={8}  {...blockProps} />
          <Block width={140} height={14} {...blockProps} />
          <Block width={100} height={8}  {...blockProps} />
        </View>
        <Block width={72} height={32} radius={6} {...blockProps} />
      </View>
    );
  }

  return null;
}

const s = StyleSheet.create({
  block: { overflow: "hidden" },

  productCard: {
    borderRadius: 12,
    borderWidth:  1,
    overflow:     "hidden",
    flexShrink:   0,
  },
  productInfo: {
    padding: 10,
    gap:     8,
  },

  reviewRow: {
    paddingVertical:   16,
    borderBottomWidth: 1,
    gap:               8,
  },
  reviewLeft: {
    flex: 1,
    gap:  8,
  },

  listRow: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingVertical:   14,
    gap:               12,
    borderBottomWidth: 1,
  },
  listText: {
    flex: 1,
    gap:  8,
  },

  banner: {
    borderRadius:      12,
    borderWidth:       1,
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 16,
    paddingVertical:   14,
    gap:               12,
  },
  bannerLeft: {
    flex: 1,
    gap:  8,
  },
});
