import type { WhenExpression as WhenExpressionImpl } from 'whenexpr'
import { evaluateWhen as evaluateWhenImpl, resolveContextValue as resolveContextValueImpl } from 'whenexpr'

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
 *
 * Supported operators: `!`, `==`, `!=`, `===`, `!==`, `<`, `<=`, `>`, `>=`,
 * `&&`, `||`, `+`, `-`, `*`, `/`, `%`. Parentheses, number and string literals
 * are also supported.
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
 * A statically-validated `when` expression string. Used inside `define*`
 * helpers to surface unknown context keys and syntax errors as TypeScript
 * errors at the call site.
 */
export type WhenExpression<T, S extends string> = WhenExpressionImpl<T, S>

/** Options for `evaluateWhen`. */
export interface EvaluateWhenOptions {
  /**
   * Throw when the expression references a context key that does not exist.
   *
   * @default false
   */
  strict?: boolean
}

/**
 * Evaluate a when-clause expression string against a context object.
 *
 * @example
 * evaluateWhen('dockOpen && clientType == embedded', ctx)
 */
export function evaluateWhen<T extends object, const E extends string>(
  expression: E & WhenExpressionImpl<T, E>,
  context: T,
  options?: EvaluateWhenOptions,
): boolean {
  return evaluateWhenImpl(expression as any, context, options)
}

/**
 * Resolve a context value by key. Supports namespaced keys with `.` or `:`
 * separators. Returns `undefined` for unknown keys.
 */
export function resolveContextValue<T extends Record<string, unknown>>(
  key: string,
  context: T,
): unknown {
  return resolveContextValueImpl(key, context)
}
