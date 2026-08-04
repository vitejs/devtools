/**
 * Inline `:style` helpers for `DevframeViewGroup.accentColor` — an optional,
 * arbitrary CSS color set by the group's owner. Since the value isn't known
 * at build time it can't become a UnoCSS utility class (mirrors the
 * `getHashColorFromString` → `HashBadge` pattern), so callers bind these as
 * `:style` and keep their default Uno classes (e.g. `text-primary`,
 * `bg-active`) as the fallback for when `accentColor` is unset — per the
 * field's own doc comment.
 */

/** Text color only — for the group button / anchor icon. */
export function accentTextStyle(color: string | undefined): { color: string } | undefined {
  return color ? { color } : undefined
}

/** Text color plus a soft tinted background — for an active/selected row. */
export function accentActiveStyle(color: string | undefined): { color: string, backgroundColor: string } | undefined {
  if (!color)
    return undefined
  return {
    color,
    backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
  }
}
