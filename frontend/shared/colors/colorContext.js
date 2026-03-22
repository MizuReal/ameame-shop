/**
 * colorContext.js
 * ============================================================
 * Resolves the active theme + scheme and exposes the full
 * semantic token map via React context.
 *
 * No NativeWind / CSS variables involved. Tokens are plain JS
 * objects consumed via the useColors() hook in components.
 *
 * Two hooks are exported:
 *   useTheme()  — theme/scheme state and setters (same as before)
 *   useColors() — resolved token map { "--surface-brand-primary": "108 71 194", ... }
 *
 * Token values are bare "R G B" channel strings. Wrap them for use
 * in style props using the utilities from styleUtils.js:
 *   rgb(tokens["--surface-brand-primary"])        → "rgb(108, 71, 194)"
 *   withOpacity(tokens["--text-on-filled"], 0.5)  → "rgba(250, 250, 250, 0.5)"
 *
 * Components never import primitives or semantics directly.
 * All color consumption goes through useColors().
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance } from "react-native";

import { getPrimitives, themes } from "./primitives";
import { createSemantics } from "./semantics";

// ─── Context ──────────────────────────────────────────────────────────────────

const ColorContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   children: React.ReactNode,
 *   initialTheme?: keyof typeof themes,
 *   initialScheme?: 'light' | 'dark' | 'system',
 * }} props
 */
export function ColorProvider({
  children,
  initialTheme = "default",
  initialScheme = "system",
}) {
  const [themeName,    setThemeName]    = useState(initialTheme);
  const [scheme,       setSchemeState]  = useState(initialScheme);
  const [systemScheme, setSystemScheme] = useState(
    Appearance.getColorScheme() === "dark" ? "dark" : "light"
  );

  // Track OS appearance changes
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === "dark" ? "dark" : "light");
    });
    return () => sub.remove();
  }, []);

  const resolvedScheme = scheme === "system" ? systemScheme : scheme;

  // Build the token map whenever theme or scheme changes.
  // Single source of truth for all colors in the app.
  const tokens = useMemo(() => {
    const primitives = getPrimitives(themeName, resolvedScheme);
    return createSemantics(primitives);
  }, [themeName, resolvedScheme]);

  const setTheme  = useCallback((name)  => setThemeName(name),    []);
  const setScheme = useCallback((value) => setSchemeState(value), []);

  const value = useMemo(
    () => ({ themeName, scheme, resolvedScheme, setTheme, setScheme, tokens }),
    [themeName, scheme, resolvedScheme, setTheme, setScheme, tokens]
  );

  return (
    <ColorContext.Provider value={value}>
      {children}
    </ColorContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useColorContext() {
  const ctx = useContext(ColorContext);
  if (!ctx) throw new Error("useTheme / useColors must be called inside <ColorProvider>");
  return ctx;
}

/**
 * Returns theme/scheme state and setters.
 *
 * @returns {{
 *   themeName:      string,
 *   scheme:         'light' | 'dark' | 'system',
 *   resolvedScheme: 'light' | 'dark',
 *   setTheme:       (name: string) => void,
 *   setScheme:      (scheme: 'light' | 'dark' | 'system') => void,
 * }}
 */
export function useTheme() {
  const { themeName, scheme, resolvedScheme, setTheme, setScheme } = useColorContext();
  return { themeName, scheme, resolvedScheme, setTheme, setScheme };
}

/**
 * Returns the full resolved semantic token map for the current theme/scheme.
 * Values are bare "R G B" channel strings — wrap with rgb() or withOpacity()
 * from styleUtils.js before using in style props.
 *
 * @returns {Record<string, string>}
 *
 * @example
 *   const tokens = useColors();
 *   <View style={{ backgroundColor: rgb(tokens["--surface-brand-primary"]) }} />
 *   <Text style={{ color: withOpacity(tokens["--shared-text-on-filled"], 0.5) }} />
 */
export function useColors() {
  return useColorContext().tokens;
}
