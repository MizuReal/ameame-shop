/**
 * ScrollList.js
 * ─────────────────────────────────────────────────────────────
 * Horizontal or vertical scrollable list with consistent spacing.
 * Thin wrapper around FlatList that enforces design system padding
 * and hides scrollbars.
 *
 * Design ref (manga_ecommerce_mobile_ui — .prod-scroll, .chips):
 *   Horizontal scroll, no scrollbar, 16px side padding,
 *   10–14px gap between items, clips overflow cleanly.
 *
 * Props:
 *   data          any[]
 *   renderItem    ({ item, index }) => ReactNode
 *   keyExtractor  (item, index) => string
 *   horizontal    boolean   default: true
 *   gap           number    default: 10
 *   paddingH      number    default: 16 — padding at start/end of list
 *   paddingV      number    default: 0
 *   showsScrollIndicator boolean  default: false
 *   onEndReached  () => void
 *   ListEmptyComponent  ReactNode
 *   ListHeaderComponent ReactNode
 *   ListFooterComponent ReactNode
 *   style         ViewStyle
 *   contentContainerStyle ViewStyle
 *
 *   ── Group snapping (horizontal only) ──────────────────────────────────────
 *   snapColumns   number | undefined
 *                 When set on a horizontal list, items are grouped into pages
 *                 of `snapColumns` items each. The list snaps page-by-page on
 *                 scroll. Each page fills the visible list width; items inside
 *                 share the available space evenly with `gap` between them.
 *
 *                 The screen/parent does NOT need to change — snapColumns is
 *                 opt-in and fully transparent to callers that omit it.
 *
 *   ── Entrance animation (horizontal plain mode) ────────────────────────────
 *   skipEntranceAnimation  boolean  default: false
 *                 When false (default), items in a plain horizontal list slide
 *                 in smoothly from right to left on mount. Pass true for
 *                 skeleton/placeholder rows so they appear instantly.
 *
 * Usage:
 *   // Plain horizontal product scroll — slides in on load
 *   <ScrollList
 *     data={products}
 *     renderItem={({ item }) => <ProductCard product={item} />}
 *     keyExtractor={(item) => item.id}
 *   />
 *
 *   // Snapping horizontal scroll — 2 cards per page
 *   <ScrollList
 *     data={products}
 *     renderItem={({ item }) => <ProductCard product={item} />}
 *     keyExtractor={(item) => item.id}
 *     snapColumns={2}
 *   />
 *
 *   // Vertical feed (unchanged)
 *   <ScrollList
 *     horizontal={false}
 *     gap={12}
 *     data={reviews}
 *     renderItem={({ item }) => <ReviewCard {...item} />}
 *     keyExtractor={(item) => item.id}
 *   />
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Animated, Easing, FlatList, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@colors/colorContext";
import { rgb } from "@styles/styleUtils";

// ─── Calculate optimal snap columns based on available width ─────────────────────
function calculateOptimalColumns(listWidth, paddingH, gap, minItemWidth = 150) {
  if (!listWidth || listWidth < minItemWidth) return 1;

  const availableWidth = listWidth - paddingH * 2;
  const maxColumns = Math.floor(availableWidth / minItemWidth);

  for (let cols = maxColumns; cols >= 1; cols--) {
    const totalGapWidth = gap * (cols - 1);
    const itemWidth = (availableWidth - totalGapWidth) / cols;
    if (itemWidth >= minItemWidth) return cols;
  }

  return 1;
}

// ─── Snapping mode ────────────────────────────────────────────────────────────

function chunkArray(arr, size) {
  const pages = [];
  for (let i = 0; i < arr.length; i += size) {
    pages.push(arr.slice(i, i + size));
  }
  return pages;
}

function SnapGroup({
  group,
  renderItem,
  keyExtractor,
  gap,
  paddingH,
  paddingV,
  listWidth,
  totalColumns,
  fixedItemWidth,
  skipEntranceAnimation,
}) {
  const availableWidth = listWidth - paddingH * 2;
  const isPartialPage = group.length < totalColumns;

  const itemW = isPartialPage
    ? (availableWidth - gap * (group.length - 1)) / group.length
    : fixedItemWidth || (availableWidth - gap * (group.length - 1)) / group.length;

  const totalContentWidth = itemW * group.length + gap * (group.length - 1);
  const shouldCenter =
    !isPartialPage && !!fixedItemWidth && totalContentWidth < availableWidth;
  const centerOffset = shouldCenter ? (availableWidth - totalContentWidth) / 2 : 0;

  // ── Center animation — seeded at the FINAL value to prevent mount-slide ──
  const centerAnimation = useRef(new Animated.Value(centerOffset)).current;
  const prevCenterOffset = useRef(centerOffset);

  useEffect(() => {
    // Only animate if centerOffset genuinely changed after mount (e.g. rotation)
    if (prevCenterOffset.current === centerOffset) return;
    prevCenterOffset.current = centerOffset;

    if (!skipEntranceAnimation) {
      Animated.timing(centerAnimation, {
        toValue: centerOffset,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      centerAnimation.setValue(centerOffset);
    }
  // centerAnimation is a stable ref — safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerOffset, skipEntranceAnimation]);

  // ── Per-item entrance animations ──────────────────────────────────────────
  // Seed translateX at SLIDE_DISTANCE so items actually travel on entrance.
  // Opacity goes 0 → 1 so there is no hard pop.
  const SLIDE_DISTANCE = 32;

  const animationsRef = useRef([]);
  if (animationsRef.current.length !== group.length) {
    const prev = animationsRef.current;
    animationsRef.current = group.map((_, i) => {
      if (prev[i]) return prev[i];
      return {
        opacity: new Animated.Value(skipEntranceAnimation ? 1 : 0),
        translateX: new Animated.Value(skipEntranceAnimation ? 0 : SLIDE_DISTANCE),
      };
    });
  }
  const animations = animationsRef.current;

  const hasAnimatedIn = useRef(false);

  useLayoutEffect(() => {
    if (skipEntranceAnimation || hasAnimatedIn.current) return;
    hasAnimatedIn.current = true;

    Animated.stagger(
      60,
      animations.map(({ opacity, translateX }) =>
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 280,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      )
    ).start();
  // animations is a stable ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipEntranceAnimation]);

  return (
    <View
      style={[
        s.snapPage,
        {
          width: listWidth,
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
        },
      ]}
    >
      <Animated.View
        style={[
          s.snapContent,
          shouldCenter && { transform: [{ translateX: centerAnimation }] },
        ]}
      >
        {group.map((item, index) => (
          <Animated.View
            key={keyExtractor(item, index)}
            style={[
              s.snapItem,
              { width: itemW },
              index < group.length - 1 && { marginRight: gap },
              {
                opacity: animations[index].opacity,
                transform: [{ translateX: animations[index].translateX }],
              },
            ]}
          >
            {renderItem({ item, index, itemWidth: itemW })}
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}

// ─── Plain-mode animated item wrapper ────────────────────────────────────────
//
// Wraps each FlatList cell in a plain horizontal list with a staggered
// slide-in + fade so the "New Arrivals" row flows smoothly from right to left
// instead of popping in all at once.

const PLAIN_SLIDE_DISTANCE = 28;
const PLAIN_STAGGER_MS     = 55;
const PLAIN_DURATION_MS    = 300;

function AnimatedItem({ children, index, skipEntranceAnimation }) {
  const opacity    = useRef(new Animated.Value(skipEntranceAnimation ? 1 : 0)).current;
  const translateX = useRef(new Animated.Value(skipEntranceAnimation ? 0 : PLAIN_SLIDE_DISTANCE)).current;
  const didAnimate = useRef(false);

  useLayoutEffect(() => {
    if (skipEntranceAnimation || didAnimate.current) return;
    didAnimate.current = true;

    const delay = index * PLAIN_STAGGER_MS;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: PLAIN_DURATION_MS,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: PLAIN_DURATION_MS + 20,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  // opacity/translateX are stable refs; index won't change for a given cell
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScrollList({
  data,
  renderItem,
  keyExtractor,
  horizontal                = true,
  gap                       = 10,
  paddingH                  = 16,
  paddingV                  = 0,
  snapColumns,
  fixedItemWidth,
  skipEntranceAnimation     = false,
  showsScrollIndicator      = false,
  onEndReached,
  ListEmptyComponent,
  ListHeaderComponent,
  ListFooterComponent,
  style,
  contentContainerStyle,
}) {
  const tokens = useColors();
  const { width: windowWidth } = useWindowDimensions();
  const [listWidth, setListWidth] = useState(windowWidth);

  const onLayout = useCallback((e) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setListWidth(w);
  }, []);

  // For horizontal plain lists (e.g. New Arrivals), wrap each renderItem output
  // in AnimatedItem so cards slide in smoothly from right to left on mount.
  // Vertical lists and lists with skipEntranceAnimation pass through unchanged.
  const wrappedRenderItem = useCallback(
    ({ item, index, ...rest }) => {
      const cell = renderItem({ item, index, ...rest });

      if (!horizontal || skipEntranceAnimation) return cell;

      return (
        <AnimatedItem
          key={keyExtractor(item, index)}
          index={index}
          skipEntranceAnimation={skipEntranceAnimation}
        >
          {cell}
        </AnimatedItem>
      );
    },
    // renderItem/keyExtractor/horizontal/skipEntranceAnimation are stable per render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [horizontal, skipEntranceAnimation, renderItem, keyExtractor]
  );

  // ── Snapping mode ──────────────────────────────────────────────────────────
  if (horizontal && snapColumns) {
    const effectiveWidth   = listWidth;
    const optimalColumns   = calculateOptimalColumns(effectiveWidth, paddingH, gap);
    const effectiveColumns = Math.max(optimalColumns, snapColumns);

    const pages      = chunkArray(data ?? [], effectiveColumns);
    const fixedWidth = effectiveWidth;

    return (
      <View style={[s.container, style]}>
        <FlatList
          data={pages}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          snapToInterval={fixedWidth}
          showsHorizontalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={ListEmptyComponent}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={ListFooterComponent}
          onLayout={onLayout}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          scrollEventThrottle={16}
          removeClippedSubviews={false}
          renderItem={({ item: group }) => (
            <SnapGroup
              group={group}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              gap={gap}
              paddingH={paddingH}
              paddingV={paddingV}
              listWidth={fixedWidth}
              totalColumns={effectiveColumns}
              fixedItemWidth={fixedItemWidth}
              skipEntranceAnimation={skipEntranceAnimation}
            />
          )}
          style={[s.list]}
        />

        <LinearGradient
          colors={[rgb(tokens["--base-canvas"]), "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          locations={[0, 0.3]}
          style={s.leftFade}
          pointerEvents="none"
        />
        <LinearGradient
          colors={["transparent", rgb(tokens["--base-canvas"])]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          locations={[0.7, 1]}
          style={s.rightFade}
          pointerEvents="none"
        />
      </View>
    );
  }

  // ── Plain mode ─────────────────────────────────────────────────────────────

  return (
    <View style={[s.container, style]}>
      <FlatList
        data={data}
        renderItem={wrappedRenderItem}
        keyExtractor={keyExtractor}
        horizontal={horizontal}
        showsHorizontalScrollIndicator={horizontal ? showsScrollIndicator : undefined}
        showsVerticalScrollIndicator={!horizontal ? showsScrollIndicator : undefined}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={ListEmptyComponent}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        ItemSeparatorComponent={() => (
          <View style={horizontal ? { width: gap } : { height: gap }} />
        )}
        contentContainerStyle={[
          {
            paddingHorizontal: horizontal ? paddingH : 0,
            paddingVertical: paddingV,
            paddingLeft: horizontal ? paddingH : 0,
            paddingRight: horizontal ? paddingH : 0,
          },
          contentContainerStyle,
        ]}
        style={s.list}
        // Always wire up onLayout in plain horizontal mode — ensures listWidth
        // is accurate if the list ever lives inside a non-full-width container.
        onLayout={horizontal ? onLayout : undefined}
        // Prevents the list from clipping animating items that start off-edge
        removeClippedSubviews={false}
      />

      {horizontal && (
        <>
          <LinearGradient
            colors={[rgb(tokens["--base-canvas"]), "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            locations={[0, 0.3]}
            style={s.leftFade}
            pointerEvents="none"
          />
          <LinearGradient
            colors={["transparent", rgb(tokens["--base-canvas"])]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            locations={[0.7, 1]}
            style={s.rightFade}
            pointerEvents="none"
          />
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { position: "relative" },
  list:      { flexGrow: 0 },
  snapPage: {
    flexDirection: "row",
    alignItems:    "center",
  },
  snapContent: {
    flexDirection: "row",
    alignItems:    "center",
  },
  snapItem: {
    flexShrink: 0,
  },
  leftFade: {
    position: "absolute",
    left:     0,
    top:      0,
    bottom:   0,
    width:    30,
    zIndex:   1,
  },
  rightFade: {
    position: "absolute",
    right:  0,
    top:    0,
    bottom: 0,
    width:  30,
    zIndex: 1,
  },
});