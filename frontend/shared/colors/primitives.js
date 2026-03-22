// ─── Shared intent scales (same across all themes) ────────────────────────────

const INTENTS_LIGHT = {
  success: {
    fill: { subtle: "138 224 158", base: "40 167 69",  strong: "32 142 57"  },
    ink:  { subtle: "138 224 158", base: "40 167 69",  strong: "25 110 45"  },
  },
  warning: {
    fill: { subtle: "255 229 150", base: "255 193 7",  strong: "230 171 0"  },
    ink:  { subtle: "255 229 150", base: "255 193 7",  strong: "189 142 0"  },
  },
  information: {
    fill: { subtle: "114 222 239", base: "23 162 184", strong: "19 139 158" },
    ink:  { subtle: "114 222 239", base: "23 162 184", strong: "14 107 122" },
  },
  error: {
    fill: { subtle: "241 178 185", base: "220 53 69",  strong: "204 39 55"  },
    ink:  { subtle: "241 178 185", base: "220 53 69",  strong: "170 31 44"  },
  },
};

const INTENTS_DARK = {
  success: {
    fill: { subtle: "20 78 34",    base: "40 167 69",  strong: "54 206 89"  },
    ink:  { subtle: "20 78 34",    base: "40 167 69",  strong: "95 216 123" },
  },
  warning: {
    fill: { subtle: "148 111 0",   base: "255 193 7",  strong: "255 206 60" },
    ink:  { subtle: "148 111 0",   base: "255 193 7",  strong: "255 219 110"},
  },
  information: {
    fill: { subtle: "11 75 85",    base: "23 162 184", strong: "33 202 228" },
    ink:  { subtle: "11 75 85",    base: "23 162 184", strong: "78 212 233" },
  },
  error: {
    fill: { subtle: "139 24 36",   base: "220 53 69",  strong: "227 99 112" },
    ink:  { subtle: "139 24 36",   base: "220 53 69",  strong: "235 142 152"},
  },
};

// ─── Neutral scale (same across all themes) ───────────────────────────────────

const NEUTRAL_LIGHT = {
  faint:  "250 250 250",
  dim:    "236 236 236",
  subtle: "214 214 214",
  muted:  "188 188 188",
  base:   "158 158 158",
  strong: "122 122 122",
  deep:   "82 82 82",
  heavy:  "36 36 36",
};

const NEUTRAL_DARK = {
  faint:  "18 18 18",
  dim:    "28 28 28",
  subtle: "44 44 44",
  muted:  "72 72 72",
  base:   "110 110 110",
  strong: "150 150 150",
  deep:   "200 200 200",
  heavy:  "241 240 240",
};

// ─── Theme definitions ────────────────────────────────────────────────────────
// Each theme provides light + dark variants for brand and accent.
// neutral and intents are automatically merged in getPrimitives().
// accent follows the same { fill, ink } × { subtle, base, strong } shape as intents.
//   fill  → background/surface use  (lighter in light, darker in dark)
//   ink   → text / icon / border use (darker in light, lighter in dark)

export const themes = {

  default: {
    light: {
      brand: {
        faint:  "232 244 255",
        dim:    "200 229 255",
        subtle: "158 208 255",
        muted:  "105 181 252",
        base:   "18 143 247",
        strong: "14 115 200",
        deep:   "10 82 143",
        heavy:  "5 45 79",
      },
      accent: {
        fill: { subtle: "175 217 164", base: "109 188 92", strong: "86 156 70"  },
        ink:  { subtle: "175 217 164", base: "86 156 70",  strong: "60 110 48"  },
      },
    },

    dark: {
      brand: {
        faint:  "5 45 79",
        dim:    "8 63 111",
        subtle: "10 82 143",
        muted:  "14 110 188",
        base:   "18 143 247",
        strong: "84 177 252",
        deep:   "153 209 255",
        heavy:  "224 242 255",
      },
      accent: {
        fill: { subtle: "61 110 49",   base: "109 188 92", strong: "154 212 142" },
        ink:  { subtle: "61 110 49",   base: "109 188 92", strong: "154 212 142" },
      },
    },
  },

  warm: {
    light: {
      brand: {
        faint:  "248 236 226",
        dim:    "236 205 177",
        subtle: "224 175 133",
        muted:  "212 144 84",
        base:   "196 118 49",
        strong: "147 88 37",
        deep:   "98 59 24",
        heavy:  "41 24 10",
      },
      accent: {
        fill: { subtle: "226 193 116", base: "189 145 40", strong: "139 106 29" },
        ink:  { subtle: "226 193 116", base: "139 106 29", strong: "97 74 20"   },
      },
    },
    dark: {
      brand: {
        faint:  "41 24 10",
        dim:    "65 39 16",
        subtle: "98 59 24",
        muted:  "139 83 35",
        base:   "196 118 49",
        strong: "218 160 108",
        deep:   "231 191 157",
        heavy:  "243 223 206",
      },
      accent: {
        fill: { subtle: "88 67 19",    base: "189 145 40", strong: "220 181 91" },
        ink:  { subtle: "88 67 19",    base: "189 145 40", strong: "220 181 91" },
      },
    },
  },

  cyan: {
    light: {
      brand: {
        faint:  "237 248 248",
        dim:    "200 234 234",
        subtle: "159 219 219",
        muted:  "114 202 202",
        base:   "78 188 188",
        strong: "56 148 148",
        deep:   "39 104 104",
        heavy:  "20 52 52",
      },
      accent: {
        fill: { subtle: "160 199 227", base: "73 148 202", strong: "48 117 166" },
        ink:  { subtle: "160 199 227", base: "48 117 166", strong: "33 82 117"  },
      },
    },
    dark: {
      brand: {
        faint:  "20 52 52",
        dim:    "28 74 74",
        subtle: "39 104 104",
        muted:  "53 141 141",
        base:   "78 188 188",
        strong: "137 210 210",
        deep:   "181 227 227",
        heavy:  "225 244 244",
      },
      accent: {
        fill: { subtle: "34 84 119",   base: "73 148 202", strong: "136 186 221" },
        ink:  { subtle: "34 84 119",   base: "73 148 202", strong: "136 186 221" },
      },
    },
  },

  magenta: {
    light: {
      brand: {
        faint:  "249 235 245",
        dim:    "237 192 223",
        subtle: "224 148 201",
        muted:  "210 101 177",
        base:   "199 61 158",
        strong: "154 45 121",
        deep:   "107 31 84",
        heavy:  "51 15 40",
      },
      accent: {
        fill: { subtle: "198 152 221", base: "151 68 193", strong: "116 50 149" },
        ink:  { subtle: "198 152 221", base: "116 50 149", strong: "82 35 105"  },
      },
    },
    dark: {
      brand: {
        faint:  "51 15 40",
        dim:    "75 22 59",
        subtle: "107 31 84",
        muted:  "146 42 115",
        base:   "199 61 158",
        strong: "217 125 189",
        deep:   "231 172 213",
        heavy:  "245 219 237",
      },
      accent: {
        // dark: fill uses the deep/dim stops; ink uses lighter stops for legibility
        fill: { subtle: "80 34 103",   base: "151 68 193", strong: "185 129 213" },
        ink:  { subtle: "80 34 103",   base: "151 68 193", strong: "210 175 228" },
      },
    },
  },

  tako: {
    light: {
      brand: {
        faint:  "242 240 247",
        dim:    "220 216 232",
        subtle: "191 184 211",
        muted:  "150 142 176",
        base:   "87 80 104",
        strong: "69 63 84",
        deep:   "48 44 59",
        heavy:  "26 24 32",
      },
      accent: {
        // light: fill uses pale/mid stops; ink uses darker stops for legibility on light bg
        fill: { subtle: "255 199 141", base: "242 154 48", strong: "206 127 32" },
        ink:  { subtle: "255 199 141", base: "206 127 32", strong: "146 89 22"  },
      },
    },

    dark: {
      brand: {
        faint:  "26 24 32",
        dim:    "37 34 46",
        subtle: "48 44 59",
        muted:  "66 60 80",
        base:   "87 80 104",
        strong: "140 132 166",
        deep:   "189 182 210",
        heavy:  "232 229 243",
      },
      accent: {
        // dark: fill uses deep/dim stops; ink uses lighter stops for legibility on dark bg
        fill: { subtle: "146 89 22",   base: "242 154 48", strong: "255 187 110" },
        ink:  { subtle: "146 89 22",   base: "242 154 48", strong: "255 214 166" },
      },
    },
  }
};

// ─── Resolver ─────────────────────────────────────────────────────────────────

/**
 * Returns the full resolved primitive palette for a theme + scheme.
 * Merges neutral and intents (shared) with the theme's brand/accent.
 *
 * @param {keyof typeof themes} themeName
 * @param {'light' | 'dark'} scheme
 * @returns {Primitives}
 */
export function getPrimitives(themeName, scheme) {
  const theme  = themes[themeName] ?? themes.default;
  const isDark = scheme === "dark";

  return {
    neutral:     isDark ? NEUTRAL_DARK        : NEUTRAL_LIGHT,
    brand:       isDark ? theme.dark.brand    : theme.light.brand,
    accent:      isDark ? theme.dark.accent   : theme.light.accent,
    ...(isDark   ? INTENTS_DARK : INTENTS_LIGHT),
  };
}

/**
 * @typedef {{ faint:string, dim:string, subtle:string, muted:string, base:string, strong:string, deep:string, heavy:string }} FullScale
 * @typedef {{ subtle:string, base:string, strong:string }} IntentScale
 * @typedef {{ fill: IntentScale, ink: IntentScale }} SplitIntentScale
 * @typedef {{
 *   neutral:     FullScale,
 *   brand:       FullScale,
 *   accent:      SplitIntentScale,
 *   success:     SplitIntentScale,
 *   warning:     SplitIntentScale,
 *   information: SplitIntentScale,
 *   error:       SplitIntentScale,
 * }} Primitives
 */