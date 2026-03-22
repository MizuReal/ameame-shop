/**
 * semantics.js
 * ============================================================
 * Maps raw primitive values to semantic CSS variable assignments.
 *
 * createSemantics() returns a flat object of:
 *   { "--surface-brand-primary": "108 71 194", ... }
 *
 * This is consumed by color-context.js, which writes these as
 * CSS variables on the root element whenever theme or scheme changes.
 * Tailwind classes then reference those variables.
 *
 * Token naming mirrors the CSS variable names in tailwind.config.js:
 *   --{element}-{semantic}-{hierarchy}
 *   --{element}-{semantic}-{hierarchy}-{state}
 *
 * Elements:   base, surface, text, icon, border, shared
 * Semantics:  brand, accent, neutral, success, warning, information, error
 * Hierarchy:  primary, secondary, tertiary, weak
 * States:     hover, pressed, focus, disabled  (kebab-case)
 *
 * Rules:
 *   - Never import semantics in components — use Tailwind classes
 *   - All values are bare RGB channel strings from primitives
 *   - shared.textOnFilled uses a fixed value (near-white) — not from scale
 */

/**
 * Builds the full CSS variable map from a resolved primitives object.
 *
 * @param {import('./primitives').Primitives} p
 * @returns {Record<string, string>} flat map of CSS var name → RGB channel string
 */
export function createSemantics(p) {
  const n = p.neutral;
  const b = p.brand;
  const a = p.accent;

  return {

    // ── Base ────────────────────────────────────────────────────────────────
    "--base-canvas":     n.faint,
    "--base-sunken":     n.dim,
    "--base-foreground": n.heavy,

    // ── Shared ──────────────────────────────────────────────────────────────
    "--shared-text-on-filled":          "250 250 250",  // near-white, fixed
    "--shared-text-on-filled-disabled": "179 179 179",  // dimmed, fixed
    "--shared-focus-ring":              b.base,
    "--shared-focus-ring-offset":       n.faint,
    "--shared-placeholder":             n.base,
    "--surface-always-dark":            "15 15 15",     // fixed, never inverts
    "--text-always-light":              "250 250 250",  // fixed, never inverts

    // ── Surface · brand ─────────────────────────────────────────────────────
    "--surface-brand-primary":            b.strong,
    "--surface-brand-primary-hover":      b.deep,
    "--surface-brand-primary-pressed":    b.heavy,
    "--surface-brand-primary-disabled":   n.dim,
    "--surface-brand-primary-focus":      b.base,
    "--surface-brand-secondary":          b.faint,
    "--surface-brand-secondary-hover":    b.muted,
    "--surface-brand-secondary-disabled": n.faint,

    // ── Surface · accent ────────────────────────────────────────────────────
    "--surface-accent-primary":            p.accent.ink.base,
    "--surface-accent-primary-hover":      p.accent.ink.strong,
    "--surface-accent-primary-pressed":    p.accent.ink.strong,
    "--surface-accent-primary-disabled":   n.dim,
    "--surface-accent-secondary":          p.accent.ink.subtle,
    "--surface-accent-secondary-disabled": n.dim,

    // ── Surface · neutral ───────────────────────────────────────────────────
    "--surface-neutral-primary":   n.dim,
    "--surface-neutral-secondary": n.subtle,
    "--surface-neutral-tertiary":  n.muted,
    "--surface-neutral-strong":    n.heavy,

    // ── Surface · intent ────────────────────────────────────────────────────
    "--surface-success-primary":            p.success.fill.base,
    "--surface-success-primary-hover":      p.success.fill.strong,
    "--surface-success-primary-pressed":    p.success.fill.strong,
    "--surface-success-primary-disabled":   n.dim,
    "--surface-success-secondary":          p.success.fill.subtle,
    "--surface-success-secondary-disabled": n.dim,

    "--surface-warning-primary":            p.warning.fill.base,
    "--surface-warning-primary-hover":      p.warning.fill.strong,
    "--surface-warning-primary-pressed":    p.warning.fill.strong,
    "--surface-warning-primary-disabled":   n.dim,
    "--surface-warning-secondary":          p.warning.fill.subtle,
    "--surface-warning-secondary-disabled": n.dim,

    "--surface-information-primary":            p.information.fill.base,
    "--surface-information-primary-hover":      p.information.fill.strong,
    "--surface-information-primary-pressed":    p.information.fill.strong,
    "--surface-information-primary-disabled":   n.dim,
    "--surface-information-secondary":          p.information.fill.subtle,
    "--surface-information-secondary-disabled": n.dim,

    "--surface-error-primary":            p.error.fill.base,
    "--surface-error-primary-hover":      p.error.fill.strong,
    "--surface-error-primary-pressed":    p.error.fill.strong,
    "--surface-error-primary-disabled":   n.dim,
    "--surface-error-secondary":          p.error.fill.subtle,
    "--surface-error-secondary-disabled": n.dim,

    // ── Text · brand ────────────────────────────────────────────────────────
    "--text-brand-primary":            b.deep,
    "--text-brand-primary-hover":      b.heavy,
    "--text-brand-primary-disabled":   n.base,
    "--text-brand-secondary":          b.base,
    "--text-brand-secondary-hover":    b.deep,
    "--text-brand-secondary-disabled": n.base,
    "--text-brand-weak":               b.subtle,

    // ── Text · accent ───────────────────────────────────────────────────────
    "--text-accent-primary":          p.accent.ink.strong,
    "--text-accent-primary-disabled": n.base,
    "--text-accent-secondary":        p.accent.ink.base,

    // ── Text · neutral ──────────────────────────────────────────────────────
    "--text-neutral-primary":            n.heavy,
    "--text-neutral-primary-hover":      n.deep,
    "--text-neutral-primary-disabled":   n.base,
    "--text-neutral-secondary":          n.deep,
    "--text-neutral-secondary-hover":    n.heavy,
    "--text-neutral-secondary-disabled": n.base,
    "--text-neutral-tertiary":           n.base,
    "--text-neutral-tertiary-hover":     n.deep,
    "--text-neutral-tertiary-disabled":  n.dim,
    "--text-neutral-weak":               n.muted,
    "--text-neutral-inverted":           n.faint,

    // ── Text · intent ───────────────────────────────────────────────────────
    "--text-success-primary":          p.success.ink.strong,
    "--text-success-primary-disabled": n.base,
    "--text-success-secondary":        p.success.ink.base,

    "--text-warning-primary":          p.warning.ink.strong,
    "--text-warning-primary-disabled": n.base,
    "--text-warning-secondary":        p.warning.ink.base,

    "--text-information-primary":          p.information.ink.strong,
    "--text-information-primary-disabled": n.base,
    "--text-information-secondary":        p.information.ink.base,

    "--text-error-primary":          p.error.ink.strong,
    "--text-error-primary-disabled": n.base,
    "--text-error-secondary":        p.error.ink.base,

    // ── Icon · brand ────────────────────────────────────────────────────────
    "--icon-brand-primary":            b.deep,
    "--icon-brand-primary-hover":      b.heavy,
    "--icon-brand-primary-disabled":   n.base,
    "--icon-brand-secondary":          b.base,
    "--icon-brand-secondary-hover":    b.deep,
    "--icon-brand-secondary-disabled": n.base,

    // ── Icon · accent ───────────────────────────────────────────────────────
    "--icon-accent-primary":   p.accent.ink.strong,
    "--icon-accent-secondary": p.accent.ink.base,

    // ── Icon · neutral ──────────────────────────────────────────────────────
    "--icon-neutral-primary":            n.deep,
    "--icon-neutral-primary-hover":      n.heavy,
    "--icon-neutral-primary-disabled":   n.base,
    "--icon-neutral-secondary":          n.base,
    "--icon-neutral-secondary-hover":    n.deep,
    "--icon-neutral-secondary-disabled": n.dim,
    "--icon-neutral-weak":               n.muted,

    // ── Icon · intent ───────────────────────────────────────────────────────
    "--icon-success-primary":       p.success.ink.strong,
    "--icon-success-secondary":     p.success.ink.base,
    "--icon-warning-primary":       p.warning.ink.strong,
    "--icon-warning-secondary":     p.warning.ink.base,
    "--icon-information-primary":   p.information.ink.strong,
    "--icon-information-secondary": p.information.ink.base,
    "--icon-error-primary":         p.error.ink.strong,
    "--icon-error-secondary":       p.error.ink.base,

    // ── Border · brand ──────────────────────────────────────────────────────
    "--border-brand-primary":            b.base,
    "--border-brand-primary-hover":      b.deep,
    "--border-brand-primary-disabled":   n.dim,
    "--border-brand-secondary":          b.muted,
    "--border-brand-secondary-hover":    b.base,
    "--border-brand-secondary-disabled": n.dim,

    // ── Border · accent ─────────────────────────────────────────────────────
    "--border-accent-primary":       p.accent.ink.base,
    "--border-accent-primary-hover": p.accent.ink.strong,
    "--border-accent-secondary":     p.accent.fill.subtle,

    // ── Border · neutral ────────────────────────────────────────────────────
    "--border-neutral-primary":            n.muted,
    "--border-neutral-primary-hover":      n.deep,
    "--border-neutral-primary-disabled":   n.subtle,
    "--border-neutral-secondary":          n.subtle,
    "--border-neutral-secondary-hover":    n.base,
    "--border-neutral-secondary-disabled": n.dim,
    "--border-neutral-weak":               n.dim,

    // ── Border · intent ─────────────────────────────────────────────────────
    "--border-success-primary":       p.success.ink.base,
    "--border-success-primary-hover": p.success.ink.strong,
    "--border-success-secondary":     p.success.fill.subtle,

    "--border-warning-primary":       p.warning.ink.base,
    "--border-warning-primary-hover": p.warning.ink.strong,
    "--border-warning-secondary":     p.warning.fill.subtle,

    "--border-information-primary":       p.information.ink.base,
    "--border-information-primary-hover": p.information.ink.strong,
    "--border-information-secondary":     p.information.fill.subtle,

    "--border-error-primary":       p.error.ink.base,
    "--border-error-primary-hover": p.error.ink.strong,
    "--border-error-secondary":     p.error.fill.subtle,
  };
}