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
 * The expression language — including all operators and precedence — is provided by
 * the [`whenexpr`](https://github.com/antfu/whenexpr) package. In addition to the
 * VS-Code-style `!`/`==`/`!=`/`&&`/`||` operators, parentheses, strict equality
 * (`===`/`!==`), relational (`<`/`<=`/`>`/`>=`), arithmetic (`+ - * / %`), and
 * number/string literals are supported.
 */
export interface WhenContext {
  clientType: 'embedded' | 'standalone'
  dockOpen: boolean
  paletteOpen: boolean
  dockSelectedId: string
  /** Allow custom context variables from plugins */
  [key: string]: unknown
}

export { evaluateWhen, resolveContextValue } from 'whenexpr'
export type { WhenExpression } from 'whenexpr'
