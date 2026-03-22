/**
 * OnboardingScreen.js
 * ─────────────────────────────────────────────────────────────
 * Multi-step onboarding flow with swipeable slides, pip navigation,
 * and a primary CTA on the final slide.
 *
 * Props:
 *   slides    { title: string, subtitle: string, visual: ReactNode }[]
 *   onComplete () => void — called when user taps CTA on last slide
 *   onSkip     () => void — called when user taps Skip (shown on non-last slides)
 *   ctaLabel   string   default: "Get Started"
 *   skipLabel  string   default: "Skip"
 *
 * Usage:
 *   <OnboardingScreen
 *     slides={[
 *       { title: "Discover",  subtitle: "Browse thousands of products.", visual: <DiscoverIllustration /> },
 *       { title: "Order",     subtitle: "Fast, reliable delivery.",       visual: <OrderIllustration /> },
 *       { title: "Enjoy",     subtitle: "Curated just for you.",          visual: <EnjoyIllustration /> },
 *     ]}
 *     onComplete={() => router.replace("/home")}
 *     onSkip={() => router.replace("/home")}
 *   />
 */

import { useRef, useState, useEffect } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

const { width: SCREEN_W } = Dimensions.get("window");

export default function OnboardingScreen({
  slides     = [],
  onComplete,
  onSkip,
  ctaLabel   = "Get Started",
  skipLabel  = "Skip",
}) {
  const tokens      = useColors();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  const isLast = activeIndex === slides.length - 1;

  useEffect(() => {
    const backAction = () => {
      if (activeIndex > 0) {
        // Go to previous slide
        flatListRef.current?.scrollToIndex({ index: activeIndex - 1, animated: true });
        return true; // Prevent default back behavior
      } else {
        // On first slide, allow default back behavior (close app)
        return false;
      }
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [activeIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goNext = () => {
    if (slides.length === 0) {
      onComplete?.();
      return;
    }
    
    if (isLast) {
      onComplete?.();
    } else {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  };

  return (
    <View style={[s.root, { backgroundColor: rgb(tokens["--base-canvas"]) }]}>

      {/* Skip button */}
      {!isLast && onSkip && (
        <Pressable
          onPress={onSkip}
          style={s.skipBtn}
          accessibilityRole="button"
          accessibilityLabel={skipLabel}
        >
          <Text style={[s.skipLabel, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
            {skipLabel}
          </Text>
        </Pressable>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View style={s.slide}>
            {/* Visual area */}
            <View style={[
              s.visualWrap,
              { backgroundColor: rgb(tokens["--surface-neutral-primary"]) },
            ]}>
              {item.visual}
            </View>

            {/* Text */}
            <View style={s.textWrap}>
              <Text style={[s.title, { color: rgb(tokens["--text-neutral-primary"]) }]}>
                {item.title}
              </Text>
              <Text style={[s.subtitle, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
                {item.subtitle}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Bottom — pips + CTA */}
      <View style={s.footer}>
        {/* Pip dots */}
        <View style={s.pips}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                s.pip,
                {
                  backgroundColor: rgb(i === activeIndex
                    ? tokens["--surface-neutral-strong"]
                    : tokens["--border-neutral-secondary"]),
                  width: i === activeIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* CTA */}
        <Pressable
          onPress={goNext}
          accessibilityRole="button"
          accessibilityLabel={isLast ? ctaLabel : "Next"}
          style={({ pressed }) => [
            s.cta,
            { backgroundColor: rgb(tokens["--surface-neutral-strong"]) },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[s.ctaLabel, { color: rgb(tokens["--shared-text-on-filled"]) }]}>
            {isLast ? ctaLabel : "Next →"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  skipBtn: {
    position: "absolute",
    top:      56,
    right:    24,
    zIndex:   10,
    padding:  8,
  },
  skipLabel: {
    fontFamily:    fonts.ui.medium,
    fontSize:      13,
    letterSpacing: 0.5,
  },
  slide: {
    width: SCREEN_W,
    flex:  1,
  },
  visualWrap: {
    flex:           0.55,
    alignItems:     "center",
    justifyContent: "center",
  },
  textWrap: {
    flex:              0.45,
    paddingHorizontal: 32,
    paddingTop:        40,
    gap:               12,
  },
  title: {
    fontFamily:    fonts.special.bold,
    fontSize:      28,
    lineHeight:    33.6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.ui.regular,
    fontSize:   15,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom:     48,
    paddingTop:        24,
    gap:               20,
    alignItems:        "center",
  },
  pips: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  pip: {
    height:       4,
    borderRadius: 2,
  },
  cta: {
    height:            52,
    borderRadius:      6,
    alignSelf:         "stretch",
    alignItems:        "center",
    justifyContent:    "center",
  },
  ctaLabel: {
    fontFamily:    fonts.ui.bold,
    fontSize:      15,
    letterSpacing: 0.5,
  },
});
