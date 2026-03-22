/**
 * ImageLightbox.js
 * ─────────────────────────────────────────────────────────────
 * Full-screen image viewer with pinch-to-zoom and swipe-to-dismiss.
 * Not in the HTML refs — built from system conventions.
 *
 * Props:
 *   visible       boolean
 *   onClose       () => void
 *   images        string[]   — array of image URIs
 *   initialIndex  number     default: 0
 *   onIndexChange (index: number) => void
 *
 * Usage:
 *   <ImageLightbox
 *     visible={lightboxOpen}
 *     onClose={() => setLightboxOpen(false)}
 *     images={product.images}
 *     initialIndex={selectedIndex}
 *   />
 */

import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb, withOpacity } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

export default function ImageLightbox({
  visible      = false,
  onClose,
  images       = [],
  initialIndex = 0,
  onIndexChange,
}) {
  const tokens = useColors();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const flatListRef = useRef(null);

  // Scroll to initial index when opening
  useEffect(() => {
    if (visible && flatListRef.current && images.length > 1) {
      flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
      setActiveIndex(initialIndex);
    }
  }, [visible, initialIndex, images.length]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      setActiveIndex(idx);
      onIndexChange?.(idx);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[s.root, { backgroundColor: "rgb(0, 0, 0)" }]}>

        {/* Close button */}
        <Pressable
          onPress={onClose}
          accessibilityLabel="Close"
          style={({ pressed }) => [
            s.closeBtn,
            { backgroundColor: withOpacity(tokens["--base-foreground"], 0.6) },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={s.closeBtnLabel}>✕</Text>
        </Pressable>

        {/* Counter */}
        {images.length > 1 && (
          <View style={[s.counter, { backgroundColor: withOpacity(tokens["--base-foreground"], 0.5) }]}>
            <Text style={s.counterText}>{activeIndex + 1} / {images.length}</Text>
          </View>
        )}

        {/* Image scroll */}
        <FlatList
          ref={flatListRef}
          data={images}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: SCREEN_W, offset: SCREEN_W * index, index,
          })}
          renderItem={({ item }) => (
            <View style={s.slide}>
              <Image
                source={{ uri: item }}
                style={s.image}
                resizeMode="contain"
              />
            </View>
          )}
        />

        {/* Pip dots */}
        {images.length > 1 && (
          <View style={s.pips}>
            {images.map((_, i) => (
              <View
                key={i}
                style={[
                  s.pip,
                  {
                    backgroundColor: i === activeIndex
                      ? "rgb(250, 250, 250)"
                      : "rgba(250, 250, 250, 0.35)",
                    width: i === activeIndex ? 24 : 16,
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </RNModal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    position:     "absolute",
    top:          56,
    right:        20,
    zIndex:       10,
    width:        36,
    height:       36,
    borderRadius: 18,
    alignItems:   "center",
    justifyContent: "center",
  },
  closeBtnLabel: {
    color:      "rgb(250, 250, 250)",
    fontFamily: fonts.ui.bold,
    fontSize:   13,
  },
  counter: {
    position:          "absolute",
    top:               56,
    left:              20,
    zIndex:            10,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      20,
  },
  counterText: {
    color:      "rgb(250, 250, 250)",
    fontFamily: fonts.ui.medium,
    fontSize:   12,
  },
  slide: {
    width:          SCREEN_W,
    height:         SCREEN_H,
    alignItems:     "center",
    justifyContent: "center",
  },
  image: {
    width:  SCREEN_W,
    height: SCREEN_H * 0.8,
  },
  pips: {
    position:       "absolute",
    bottom:         48,
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
});
