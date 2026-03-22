/**
 * fonts.js
 * ─────────────────────────────────────────────────────────────
 * Font family definitions — the single place to swap typefaces.
 *
 * UI_FONT      → all interface text (body, labels, buttons, headings)
 * SPECIAL_FONT → display / hero text only (large, expressive moments)
 *
 * To change fonts globally, update UI_FONT or SPECIAL_FONT below.
 * Everything cascades — no other files need changing.
 *
 * Font strings must exactly match the keys passed to useFonts() in _layout.js:
 *   "Inter-Regular", "Inter-Medium", "Inter-SemiBold", "Inter-Bold"
 *   "PlayfairDisplay-Regular", ..., "PlayfairDisplay-Bold"
 *   "SpaceMono-Regular"
 *
 * Usage:
 *   import { fonts } from "@typography/scale";
 *   import { fonts } from "@typography/fonts";
 *   <Text style={{ fontFamily: fonts.ui.bold }}>Hello</Text>
 */

const UI_FONT      = "Inter";
const SPECIAL_FONT = "PlayfairDisplay";

const fonts = {
  /** All interface text — body, labels, buttons, headings */
  ui: {
    regular:  `${UI_FONT}-Regular`,
    medium:   `${UI_FONT}-Medium`,
    semibold: `${UI_FONT}-SemiBold`,
    bold:     `${UI_FONT}-Bold`,
  },

  /** Display / hero text — large expressive moments only */
  special: {
    regular:  `${SPECIAL_FONT}-Regular`,
    medium:   `${SPECIAL_FONT}-Medium`,
    semibold: `${SPECIAL_FONT}-SemiBold`,
    bold:     `${SPECIAL_FONT}-Bold`,
  },

  /** Monospace — inline code, technical strings */
  mono: {
    regular: "SpaceMono-Regular",
  },
};

// Named export for ESM consumers
export { fonts };

// Default export for CommonJS interop (require("@typography/fonts").fonts)
export default fonts;