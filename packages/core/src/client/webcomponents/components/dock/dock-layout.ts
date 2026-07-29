/**
 * Layout tunables for the floating dock bar (`Dock.vue`).
 *
 * Every spatial magic number the float-mode shell relies on lives here — bar
 * dimensions, viewport spacing, item capacity and drag-snapping behaviour — so
 * the bar's look and feel can be adjusted from a single place instead of being
 * scattered across the component's template, script and stylesheet.
 *
 * Pixel values are logical CSS pixels. Percent values are relative to the
 * viewport (the panel store persists `left`/`top` as `0`–`100` percentages).
 * The dimension fields ({@link DockLayout.barHeight} and friends) are projected
 * to CSS custom properties by {@link dockLayoutCssVars} and consumed by
 * `style.css`; the rest feed the positioning math in this module.
 */
export interface DockLayout {
  /** Height of the floating dock bar, in px. */
  barHeight: number
  /** Minimum width of the bar before its content grows it, in px. */
  barMinWidth: number
  /** Side length of the collapsed (minimized) nub, in px. */
  minimizedSize: number

  /** Diameter of the ambient glow behind the bar, in px. */
  glowSize: number
  /** Blur radius applied to the glow, in px. */
  glowBlur: number

  /**
   * Maximum number of dock items shown inline on the bar. Any beyond this
   * capacity are folded into the overflow button.
   */
  maxVisibleItems: number

  /**
   * Gap between the bar (and its panel) and the viewport edge, in px. Added on
   * top of the device safe-area insets.
   */
  viewportMargin: number

  /**
   * How much of the dock bar's thickness overlaps the panel/iframe, as a
   * fraction of that thickness. `0.5` floats the dock's inner half over the
   * panel (its outer half hangs past the panel edge); lower it toward `0` to
   * slide the panel clear of the bar so the content underneath stays readable,
   * or raise it toward `1` to tuck the panel further behind the bar.
   */
  panelOverlapFactor: number

  /**
   * Snap-to-edge zone width, as a viewport percentage. While dragging, a
   * position within this distance of an edge snaps flush to `0` / `100`.
   */
  edgeSnapPercent: number
  /**
   * Snap-to-center zone half-width, as a viewport percentage. A position within
   * this distance of the midpoint snaps to `50`.
   */
  centerSnapPercent: number
  /**
   * Height of the top/bottom detection zones (in px) used when deciding which
   * edge a dragged bar should dock to. A larger value widens the "top" and
   * "bottom" wedges at the expense of "left"/"right".
   */
  edgeZoneHeight: number
}

/** Which viewport edge the floating bar is docked to. */
export type DockEdge = 'top' | 'right' | 'bottom' | 'left'

/** Per-side spacing, in px (viewport margins, safe-area insets, ...). */
export interface DockMargins {
  left: number
  top: number
  right: number
  bottom: number
}

/** The built-in dock layout. Override individual fields via {@link resolveDockLayout}. */
export const DEFAULT_DOCK_LAYOUT: DockLayout = Object.freeze({
  barHeight: 35,
  barMinWidth: 100,
  minimizedSize: 22,
  glowSize: 160,
  glowBlur: 60,
  maxVisibleItems: 5,
  viewportMargin: 2,
  panelOverlapFactor: 0.2,
  edgeSnapPercent: 5,
  centerSnapPercent: 2,
  edgeZoneHeight: 70,
})

/** Merge partial overrides over {@link DEFAULT_DOCK_LAYOUT}. */
export function resolveDockLayout(overrides?: Partial<DockLayout>): DockLayout {
  if (!overrides)
    return DEFAULT_DOCK_LAYOUT
  return { ...DEFAULT_DOCK_LAYOUT, ...overrides }
}

/**
 * Project a layout's dimension fields to the CSS custom properties consumed by
 * `style.css`. Bind the result on the `#vite-devtools-anchor` root so the
 * values cascade to the bar, minimized nub and glow.
 */
export function dockLayoutCssVars(layout: DockLayout): Record<string, string> {
  return {
    '--vite-devtools-dock-height': `${layout.barHeight}px`,
    '--vite-devtools-dock-min-width': `${layout.barMinWidth}px`,
    '--vite-devtools-dock-minimized-size': `${layout.minimizedSize}px`,
    '--vite-devtools-dock-glow-size': `${layout.glowSize}px`,
    '--vite-devtools-dock-glow-blur': `${layout.glowBlur}px`,
  }
}

/**
 * Add the viewport margin on top of the device safe-area insets, yielding the
 * effective per-side spacing the bar and its panel keep from the viewport edge.
 */
export function resolveViewportMargins(safeArea: DockMargins, layout: DockLayout): DockMargins {
  return {
    left: safeArea.left + layout.viewportMargin,
    top: safeArea.top + layout.viewportMargin,
    right: safeArea.right + layout.viewportMargin,
    bottom: safeArea.bottom + layout.viewportMargin,
  }
}

/**
 * Snap a `0`–`100` viewport percentage toward the nearest edge (`0` / `100`) or
 * the center (`50`) when it falls inside the configured snap zones.
 */
export function snapDockPercent(value: number, layout: DockLayout): number {
  if (value < layout.edgeSnapPercent)
    return 0
  if (value > 100 - layout.edgeSnapPercent)
    return 100
  if (Math.abs(value - 50) < layout.centerSnapPercent)
    return 50
  return value
}

/**
 * Decide which viewport edge a dragged point belongs to, by comparing the angle
 * from the viewport center against the four corner angles (offset inward by
 * {@link DockLayout.edgeZoneHeight}).
 */
export function resolveDockEdge(params: {
  x: number
  y: number
  viewportWidth: number
  viewportHeight: number
  layout: DockLayout
}): DockEdge {
  const { x, y, viewportWidth, viewportHeight, layout } = params
  const centerX = viewportWidth / 2
  const centerY = viewportHeight / 2
  const zone = layout.edgeZoneHeight

  const deg = Math.atan2(y - centerY, x - centerX)
  const tl = Math.atan2(0 - centerY + zone, 0 - centerX)
  const tr = Math.atan2(0 - centerY + zone, viewportWidth - centerX)
  const bl = Math.atan2(viewportHeight - zone - centerY, 0 - centerX)
  const br = Math.atan2(viewportHeight - zone - centerY, viewportWidth - centerX)

  if (deg >= tl && deg <= tr)
    return 'top'
  if (deg >= tr && deg <= br)
    return 'right'
  if (deg >= br && deg <= bl)
    return 'bottom'
  return 'left'
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Resolve the pixel anchor (the center point of the bar) for a given edge.
 *
 * The axis pinned to the edge is offset by half the bar's cross-size plus the
 * viewport margin; the free axis is driven by the stored percentage and clamped
 * so the bar stays fully inside the viewport margins.
 */
export function resolveDockAnchor(params: {
  edge: DockEdge
  leftPercent: number
  topPercent: number
  viewportWidth: number
  viewportHeight: number
  dockWidth: number
  dockHeight: number
  margins: DockMargins
}): { left: number, top: number } {
  const {
    edge,
    leftPercent,
    topPercent,
    viewportWidth,
    viewportHeight,
    dockWidth,
    dockHeight,
    margins,
  } = params

  const halfWidth = dockWidth / 2
  const halfHeight = dockHeight / 2

  const left = leftPercent * viewportWidth / 100
  const top = topPercent * viewportHeight / 100

  switch (edge) {
    case 'top':
      return {
        left: clamp(left, halfWidth + margins.left, viewportWidth - halfWidth - margins.right),
        top: margins.top + halfHeight,
      }
    case 'right':
      return {
        left: viewportWidth - margins.right - halfHeight,
        top: clamp(top, halfWidth + margins.top, viewportHeight - halfWidth - margins.bottom),
      }
    case 'left':
      return {
        left: margins.left + halfHeight,
        top: clamp(top, halfWidth + margins.top, viewportHeight - halfWidth - margins.bottom),
      }
    case 'bottom':
    default:
      return {
        left: clamp(left, halfWidth + margins.left, viewportWidth - halfWidth - margins.right),
        top: viewportHeight - margins.bottom - halfHeight,
      }
  }
}
