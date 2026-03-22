/**
 * TabBar.js
 * ─────────────────────────────────────────────────────────────
 * Bottom tab bar with icon + label tabs and optional badge dot.
 *
 * Design ref (manga_ecommerce_mobile_ui — .tab-bar, .tab, .tab-dot):
 *   canvas bg · top border · 4 tabs · icon + label · accent dot indicator
 *   active: ink label bold · inactive: muted label regular
 *   badge dot: 4×4 accent circle below icon (cart notification)
 *
 * Props:
 *   tabs    { key: string, label: string, icon: ReactNode,
 *             activeIcon?: ReactNode, badge?: boolean }[]
 *             icon      — icon for inactive state
 *             activeIcon — icon for active state (falls back to icon)
 *             badge     — shows a small accent dot indicator
 *   activeKey  string — key of the active tab
 *   onPress    (key: string) => void
 *
 * The component does NOT handle navigation itself — it's a pure
 * display component. Wire it to expo-router or React Navigation
 * in your tab layout screen.
 *
 * Usage:
 *   <TabBar
 *     activeKey={currentTab}
 *     onPress={setCurrentTab}
 *     tabs={[
 *       { key: "home",    label: "Home",    icon: <HomeIcon />,    activeIcon: <HomeIconFilled /> },
 *       { key: "search",  label: "Search",  icon: <SearchIcon /> },
 *       { key: "cart",    label: "Cart",    icon: <CartIcon />,   badge: true },
 *       { key: "account", label: "Account", icon: <PersonIcon /> },
 *     ]}
 *   />
 */

import { cloneElement, isValidElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";

export default function TabBar({
  tabs      = [],
  activeKey,
  onPress,
}) {
  const tokens = useColors();
  const insets = useSafeAreaInsets();
  const iconColorActive = rgb(tokens["--icon-neutral-primary"]);
  const iconColorIdle = rgb(tokens["--icon-neutral-secondary"]);

  return (
    <View style={[
      s.bar,
      {
        backgroundColor: rgb(tokens["--base-canvas"]),
        borderTopColor:  rgb(tokens["--border-neutral-secondary"]),
        paddingBottom:   s.bar.paddingBottom + insets.bottom,
      },
    ]}>
      {tabs.map((tab) => {
        const isActive     = tab.key === activeKey;
        const renderedIcon = isActive && tab.activeIcon ? tab.activeIcon : tab.icon;
        const iconColor    = isActive ? iconColorActive : iconColorIdle;
        const coloredIcon  = isValidElement(renderedIcon)
          ? cloneElement(renderedIcon, { color: iconColor })
          : renderedIcon;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onPress?.(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            style={({ pressed }) => [s.tab, pressed && { opacity: 0.7 }]}
          >
            {/* Icon */}
            <View style={s.iconWrap}>
              {coloredIcon}
            </View>

            {/* Badge dot — accent indicator (e.g. items in cart) */}
            {tab.badge && (
              <View style={[
                s.badgeDot,
                { backgroundColor: rgb(tokens["--surface-brand-primary"]) },
              ]} />
            )}

            {/* Label */}
            <Text style={[
              s.label,
              {
                color: rgb(isActive
                  ? tokens["--text-neutral-primary"]
                  : tokens["--text-neutral-tertiary"]),
                fontFamily: isActive ? fonts.ui.bold : fonts.ui.medium,
              },
              isActive && [
                s.activeUnderline,
                { borderBottomColor: rgb(tokens["--surface-brand-primary"]) },
              ],
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection:  "row",
    alignItems:     "stretch",
    borderTopWidth: 1,
    paddingBottom:  12, // home indicator space
    paddingTop:     8,
  },
  tab: {
    flex:           1,
    alignItems:     "center",
    gap:            4,
    paddingVertical: 4,
  },
  iconWrap: {
    width:          22,
    height:         22,
    alignItems:     "center",
    justifyContent: "center",
  },
  badgeDot: {
    width:        4,
    height:       4,
    borderRadius: 2,
    marginTop:    -2,
  },
  label: {
    fontSize:      9,
    letterSpacing: 0.5,
  },
  activeUnderline: {
    borderBottomWidth: 2,
    paddingBottom:     2,
  },
});
