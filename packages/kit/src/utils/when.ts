/**
 * Context object for evaluating `when` expressions.
 *
 * Built-in variables:
 * - `clientType` — `'embedded' | 'standalone'`
 * - `dockOpen` — whether the dock panel is open
 * - `paletteOpen` — whether the command palette is open
 * - `dockSelectedId` — ID of the selected dock entry (empty string if none)
 *
 * Plugins can add namespaced variables using dot or colon separators:
 * - `vite.mode`, `vite:mode` — stored as `{ 'vite.mode': 'development' }` or nested `{ vite: { mode: 'development' } }`
 */
export interface WhenContext {
  clientType: 'embedded' | 'standalone'
  dockOpen: boolean
  paletteOpen: boolean
  dockSelectedId: string
  /** Allow custom context variables from plugins */
  [key: string]: unknown
}

/**
 * Evaluate a `when` expression against a context object.
 *
 * Supported syntax:
 * - Bare truthy: `dockOpen` → true if value is truthy
 * - Literal booleans: `true`, `false`
 * - Negation: `!paletteOpen`
 * - Equality: `clientType == embedded`
 * - Inequality: `clientType != standalone`
 * - AND: `dockOpen && !paletteOpen`
 * - OR: `paletteOpen || dockOpen`
 * - Namespaced keys: `vite.mode == development`, `vite:buildMode`
 *
 * Precedence: `||` (lowest) → `&&` → unary `!`
 */
export function evaluateWhen(expression: string, ctx: WhenContext): boolean {
  const parts = expression.split('||').map(s => s.trim())
  return parts.some((orPart) => {
    const andParts = orPart.split('&&').map(s => s.trim())
    return andParts.every((part) => {
      const trimmed = part.trim()

      // Literal booleans
      if (trimmed === 'true')
        return true
      if (trimmed === 'false')
        return false

      // Negation
      if (trimmed.startsWith('!')) {
        const key = trimmed.slice(1).trim()
        if (key === 'true')
          return false
        if (key === 'false')
          return true
        return !getContextValue(key, ctx)
      }

      // Equality/inequality
      const eqIdx = trimmed.indexOf('==')
      const neqIdx = trimmed.indexOf('!=')
      if (eqIdx !== -1 || neqIdx !== -1) {
        const isNeq = neqIdx !== -1 && (eqIdx === -1 || neqIdx < eqIdx)
        const opIdx = isNeq ? neqIdx : eqIdx
        const opLen = isNeq ? 2 : 2
        const key = trimmed.slice(0, opIdx).trim()
        const value = trimmed.slice(opIdx + opLen).trim()
        const actual = String(getContextValue(key, ctx))
        return isNeq ? actual !== value : actual === value
      }

      // Bare truthy
      return !!getContextValue(trimmed, ctx)
    })
  })
}

/**
 * Get a context value by key. Supports namespaced keys with `.` or `:` separators.
 *
 * Lookup order:
 * 1. Exact match — `ctx['vite.mode']` or `ctx['vite:mode']`
 * 2. Nested path — for `vite.mode`: `ctx.vite?.mode`; for `vite:mode`: `ctx.vite?.mode`
 */
export function getContextValue(key: string, ctx: WhenContext): unknown {
  const record = ctx as unknown as Record<string, unknown>

  // 1. Exact match
  if (key in record)
    return record[key]

  // 2. Nested path via `.` or `:`
  const separator = key.includes('.') ? '.' : key.includes(':') ? ':' : null
  if (separator) {
    const segments = key.split(separator)
    let current: unknown = record
    for (const segment of segments) {
      if (current == null || typeof current !== 'object')
        return undefined
      current = (current as Record<string, unknown>)[segment]
    }
    return current
  }

  return undefined
}
