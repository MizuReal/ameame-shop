/**
 * ImageCarousel.js
 * ─────────────────────────────────────────────────────────────
 * Horizontally scrollable image viewer with pip dot pagination.
 *
 * Props:
 *   images            string[]
 *   height            number    default: 280
 *   onIndexChange     (index: number) => void
 *   autoPlay          boolean   default: false
 *   autoPlayInterval  number    default: 3500  — ms between slides
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, Image, StyleSheet, View } from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";

const SCREEN_W = Dimensions.get("window").width;

function Pips({ count, activeIndex, tokens }) {
  if (count <= 1) return null;

  return (
    <View style={s.pipsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            s.pip,
            i === activeIndex
              ? { width: 24, backgroundColor: rgb(tokens["--base-foreground"]) }
              : { width: 16, backgroundColor: rgb(tokens["--border-neutral-primary"]) },
          ]}
        />
      ))}
    </View>
  );
}

export default function ImageCarousel({
  images            = [],
  height            = 280,
  onIndexChange,
  autoPlay          = false,
  autoPlayInterval  = 3500,
}) {
  const tokens      = useColors();
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(SCREEN_W);
  const flatListRef = useRef(null);

  // Track the current index in a ref so the interval closure always has
  // the latest value without needing to be recreated on every change.
  const activeIndexRef = useRef(0);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      activeIndexRef.current = idx;
      setActiveIndex(idx);
      onIndexChange?.(idx);
    }
  }, [onIndexChange]);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
  const getItemLayout = useCallback(
    (_, index) => ({
      length: containerWidth,
      offset: containerWidth * index,
      index,
    }),
    [containerWidth]
  );

  const handleLayout = useCallback(({ nativeEvent }) => {
    const nextWidth = Math.round(nativeEvent.layout.width);
    if (nextWidth && nextWidth !== containerWidth) {
      setContainerWidth(nextWidth);
    }
  }, [containerWidth]);

  // Auto-advance interval
  useEffect(() => {
    if (!autoPlay || images.length <= 1) return;

    const timer = setInterval(() => {
      const next = (activeIndexRef.current + 1) % images.length;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      // State + ref are updated via onViewableItemsChanged once the scroll
      // settles, so we don't set them directly here.
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [autoPlay, autoPlayInterval, images.length]);

  if (!images.length) {
    return (
      <View
        style={[
          s.empty,
          {
            height,
            backgroundColor: rgb(tokens["--surface-neutral-primary"]),
            borderBottomColor: rgb(tokens["--border-neutral-weak"]),
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        s.container,
        { height, borderBottomColor: rgb(tokens["--border-neutral-weak"]) },
      ]}
      onLayout={handleLayout}
    >
      <FlatList
        ref={flatListRef}
        data={images}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        getItemLayout={getItemLayout}
        extraData={containerWidth}
        // Prevent scrollToIndex errors if the list hasn't fully laid out yet
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index, animated: true });
          }, 200);
        }}
        renderItem={({ item }) => (
          <View style={{ width: containerWidth, height }}>
            <Image
              source={typeof item === "string" ? { uri: item } : item}
              style={s.image}
              resizeMode="cover"
            />
          </View>
        )}
      />
      <Pips count={images.length} activeIndex={activeIndex} tokens={tokens} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  empty: {
    borderBottomWidth: 1,
  },
  pipsRow: {
    position:       "absolute",
    bottom:         12,
    left:           0,
    right:          0,
    flexDirection:  "row",
    justifyContent: "center",
    alignItems:     "center",
    gap:            5,
  },
  pip: {
    height:       4,
    borderRadius: 2,
  },
  image: {
    width:  "100%",
    height: "100%",
  },
});
