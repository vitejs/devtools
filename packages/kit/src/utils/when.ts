/**
 * Context object for evaluating `when` expressions.
 *
 * Built-in variables:
 * - `clientType` — `'embedded' | 'standalone'`
 * - `dockOpen` — whether the dock panel is open
 * - `paletteOpen` — whether the command palette is open
 * - `dockSelectedId` — ID of the selected dock entry (empty string if none)
 *
 * Plugins can add custom variables via the index signature.
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
 * Get a context value by key.
 */
export function getContextValue(key: string, ctx: WhenContext): unknown {
  return (ctx as unknown as Record<string, unknown>)[key]
}
