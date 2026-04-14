// Centralized design tokens for json-render components.
// All color/border/spacing values should reference these tokens
// so the visual language stays consistent and easy to tweak.

// --- CSS custom-property references (with fallbacks) ---

export const border = 'var(--jr-border, rgba(128,128,128,0.2))'
export const borderSubtle = 'var(--jr-border, rgba(128,128,128,0.1))'
export const borderMuted = 'var(--jr-border, rgba(128,128,128,0.08))'
export const borderInput = 'var(--jr-border, rgba(128,128,128,0.3))'
export const primary = 'var(--jr-primary, #3b82f6)'
export const bg = 'var(--jr-bg, inherit)'

// --- Semantic palette ---

export const colors = {
  info: { bg: 'rgba(59,130,246,0.15)', fg: 'rgb(59,130,246)' },
  success: { bg: 'rgba(34,197,94,0.15)', fg: 'rgb(34,197,94)' },
  warning: { bg: 'rgba(234,179,8,0.15)', fg: 'rgb(234,179,8)' },
  error: { bg: 'rgba(239,68,68,0.15)', fg: 'rgb(239,68,68)' },
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
