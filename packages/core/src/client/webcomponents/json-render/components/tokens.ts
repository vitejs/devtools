// Centralized design tokens for json-render components.
// All color/border/spacing values should reference these tokens
// so the visual language stays consistent and easy to tweak.

// --- CSS custom-property references (with fallbacks) ---

export const border = 'var(--jr-border, rgba(128,128,128,0.2))'
export const borderSubtle = 'var(--jr-border, rgba(128,128,128,0.1))'
export const borderMuted = 'var(--jr-border, rgba(128,128,128,0.08))'
export const borderInput = 'var(--jr-border, rgba(128,128,128,0.3))'
// Interactive-hover border (Card) — a clearer step up than borderInput, without going full `primary`.
export const borderStrong = 'var(--jr-border, rgba(128,128,128,0.5))'
// Keep in sync with the DevTools theme primary (packages/ui/src/unocss/theme.ts).
export const primary = 'var(--jr-primary, #6b84fd)'
export const bg = 'var(--jr-bg, inherit)'

// --- Semantic palette ---

/** Badge's pill fill. Card/Stack use their own lighter tints below — a badge-strength fill would read as a heavy block over a whole card. */
export const colors = {
  info: { bg: 'rgba(59,130,246,0.15)', fg: 'rgb(59,130,246)' },
  success: { bg: 'rgba(34,197,94,0.15)', fg: 'rgb(34,197,94)' },
  warning: { bg: 'rgba(234,179,8,0.15)', fg: 'rgb(234,179,8)' },
  danger: { bg: 'rgba(239,68,68,0.15)', fg: 'rgb(239,68,68)' },
  default: { bg: 'rgba(128,128,128,0.15)', fg: 'inherit' },
} as const

// --- Surface / overlay values ---

export const surfaceMuted = 'rgba(128,128,128,0.05)'
export const surfaceSubtle = 'rgba(128,128,128,0.1)'
export const surfaceBadge = 'rgba(128,128,128,0.15)'
export const hoverOverlay = 'rgba(128,128,128,0.05)'

// --- Code / tree syntax colors ---

export const syntaxString = '#a5d6ad'
export const syntaxNumber = '#dcdcaa'

// --- Helpers ---

export function borderSolid(token = border) {
  return `1px solid ${token}`
}

/** Resting/hover background + border a `variant` resolves to on Card/Stack. */
export interface VariantSurface {
  background?: string
  /** Card-only — its header bar reads a step stronger than the body it sits above, so a titled card is a two-tone surface rather than one flat tint. */
  headerBackground?: string
  border?: string
  hoverBackground?: string
  hoverBorder?: string
}

/** No semantic hue — border stays unset, hover stays a neutral grey. */
const neutralSurfaces: Record<'primary' | 'secondary' | 'ghost', VariantSurface> = {
  primary: { hoverBackground: surfaceSubtle, hoverBorder: borderStrong },
  secondary: { background: surfaceMuted, hoverBackground: surfaceSubtle, hoverBorder: borderStrong },
  ghost: { hoverBackground: surfaceSubtle, hoverBorder: borderStrong },
}

const semanticSurfaces: Record<'info' | 'success' | 'warning' | 'danger', Required<Pick<VariantSurface, 'background' | 'headerBackground' | 'border' | 'hoverBackground' | 'hoverBorder'>>> = {
  info: { background: 'rgba(59,130,246,0.08)', headerBackground: 'rgba(59,130,246,0.18)', border: 'rgba(59,130,246,0.25)', hoverBackground: 'rgba(59,130,246,0.25)', hoverBorder: 'rgba(59,130,246,0.6)' },
  success: { background: 'rgba(34,197,94,0.08)', headerBackground: 'rgba(34,197,94,0.18)', border: 'rgba(34,197,94,0.25)', hoverBackground: 'rgba(34,197,94,0.25)', hoverBorder: 'rgba(34,197,94,0.6)' },
  warning: { background: 'rgba(234,179,8,0.08)', headerBackground: 'rgba(234,179,8,0.18)', border: 'rgba(234,179,8,0.25)', hoverBackground: 'rgba(234,179,8,0.25)', hoverBorder: 'rgba(234,179,8,0.6)' },
  danger: { background: 'rgba(239,68,68,0.08)', headerBackground: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.25)', hoverBackground: 'rgba(239,68,68,0.25)', hoverBorder: 'rgba(239,68,68,0.6)' },
}

/** Resolves a `variant` prop to the surface Card and Stack render at rest and on hover. */
export function variantSurface(variant: string): VariantSurface {
  if (variant in neutralSurfaces)
    return neutralSurfaces[variant as keyof typeof neutralSurfaces]
  if (variant in semanticSurfaces)
    return semanticSurfaces[variant as keyof typeof semanticSurfaces]
  return neutralSurfaces.primary
}
