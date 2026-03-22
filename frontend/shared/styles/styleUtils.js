/**
 * scale.js
 * ============================================================
 * Named type scale — every text role in the app.
 *
 * No NativeWind / Tailwind classes. All styles are plain RN
 * StyleSheet-compatible objects.
 *
 * Two exports:
 *
 *   typeBase  — static styles (font, size, lineHeight, letterSpacing).
 *               Safe to use in StyleSheet.create() since they never change.
 *
 *   makeTypeStyles(tokens) — returns the full style object per role with
 *               color included, sourced from the live token map.
 *               Call inside a component after useColors().
 *
 * Usage in screens / components:
 *   import { makeTypeStyles } from "@typography/scale";
 *   import { useColors } from "@colors/colorContext";
 *
 *   const tokens = useColors();
 *   const type   = makeTypeStyles(tokens);
 *
 *   <Text style={type.display}>Title</Text>
 *   <Text style={type.bodySm}>Description</Text>
 *   <Text style={[type.caption, { marginTop: 4 }]}>Metadata</Text>
 *
 * Visual hierarchy:
 *   SIZE    — larger = more prominent
 *   WEIGHT  — heavier = more emphasis
 *   COLOR   — primary → secondary → tertiary (fading attention)
 *
 * Type scale (base 16px):
 *   28px  display   bold       primary    lh 1.2
 *   22px  h2        bold       primary    lh 1.25
 *   18px  h3        semibold   primary    lh 1.3
 *   16px  bodyBase  regular    primary    lh 1.5
 *   14px  bodySm    regular    secondary  lh 1.5
 *   14px  label     medium     primary    lh 1.4
 *   12px  caption   regular    tertiary   lh 1.6
 *   12px  overline  semibold   tertiary   lh 1.4  + uppercase
 *   16px  btnBase   semibold   on-filled  lh 1.2
 *   14px  btnSm     semibold   on-filled  lh 1.2
 *   13px  code      mono       secondary  lh 1.6
 */

import { fonts } from "@typography/fonts";

// ─── Color utilities ──────────────────────────────────────────────────────────────

/**
 * Converts "R G B" channel string to CSS rgb() format.
 * @param {string} channels - e.g. "108 71 194"
 * @returns {string} - e.g. "rgb(108, 71, 194)"
 */
export function rgb(channels) {
  if (!channels || typeof channels !== 'string') {
    return 'rgb(0, 0, 0)';
  }
  const normalized = channels.trim().replace(/\s+/g, ", ");
  return `rgb(${normalized})`;
}

/**
 * Converts "R G B" channel string to CSS rgba() format with opacity.
 * @param {string} channels - e.g. "108 71 194"
 * @param {number} opacity - 0 to 1
 * @returns {string} - e.g. "rgba(108, 71, 194, 0.5)"
 */
export function withOpacity(channels, opacity) {
  if (!channels || typeof channels !== 'string') {
    return `rgba(0, 0, 0, ${opacity})`;
  }
  const normalized = channels.trim().replace(/\s+/g, ", ");
  return `rgba(${normalized}, ${opacity})`;
}

// ─── Static base styles (no color) ───────────────────────────────────────────
// Safe to define once outside components — never change with theme.
// Use directly when you need to override color (e.g. text on a filled surface).

export const typeBase = {
  display:  { fontFamily: fonts.special.bold,   fontSize: 28, lineHeight: 33.6 },
  h2:       { fontFamily: fonts.ui.bold,         fontSize: 22, lineHeight: 27.5 },
  h3:       { fontFamily: fonts.ui.semibold,     fontSize: 18, lineHeight: 23.4 },
  bodyBase: { fontFamily: fonts.ui.regular,      fontSize: 16, lineHeight: 24   },
  bodySm:   { fontFamily: fonts.ui.regular,      fontSize: 14, lineHeight: 21   },
  label:    { fontFamily: fonts.ui.medium,       fontSize: 14, lineHeight: 19.6 },
  caption:  { fontFamily: fonts.ui.regular,      fontSize: 12, lineHeight: 19.2 },
  overline: { fontFamily: fonts.ui.semibold,     fontSize: 12, lineHeight: 16.8,
              letterSpacing: 0.8, textTransform: "uppercase" },
  btnBase:  { fontFamily: fonts.ui.semibold,     fontSize: 16, lineHeight: 19.2 },
  btnSm:    { fontFamily: fonts.ui.semibold,     fontSize: 14, lineHeight: 16.8 },
  code:     { fontFamily: fonts.mono.regular,    fontSize: 13, lineHeight: 20.8 },
};

// ─── Full styles with color ───────────────────────────────────────────────────
// Call inside a component after useColors(). Returns a new object when tokens
// change (on theme/scheme switch) — components re-render automatically.
//
// Default color pairings:
//   display / h2 / h3 / bodyBase / label  → neutral primary
//   bodySm / code                          → neutral secondary  (steps down)
//   caption / overline                     → neutral tertiary   (steps down)
//   btnBase / btnSm                        → on-filled          (on surfaces)

/**
 * @param {Record<string, string>} tokens — from useColors()
 * @returns {Record<string, import("react-native").TextStyle>}
 */
export function makeTypeStyles(tokens) {
  const primary   = rgb(tokens["--text-neutral-primary"]);
  const secondary = rgb(tokens["--text-neutral-secondary"]);
  const tertiary  = rgb(tokens["--text-neutral-tertiary"]);
  const onFilled  = rgb(tokens["--shared-text-on-filled"]);

  return {
    display:  { ...typeBase.display,  color: primary   },
    h2:       { ...typeBase.h2,       color: primary   },
    h3:       { ...typeBase.h3,       color: primary   },
    bodyBase: { ...typeBase.bodyBase, color: primary   },
    bodySm:   { ...typeBase.bodySm,   color: secondary },
    label:    { ...typeBase.label,    color: primary   },
    caption:  { ...typeBase.caption,  color: tertiary  },
    overline: { ...typeBase.overline, color: tertiary  },
    btnBase:  { ...typeBase.btnBase,  color: onFilled  },
    btnSm:    { ...typeBase.btnSm,    color: onFilled  },
    code:     { ...typeBase.code,     color: secondary },
  };
}
