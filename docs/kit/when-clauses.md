---
outline: deep
---

# When Clauses

When clauses are conditional expressions that control visibility and activation of commands and dock entries. They use a simple expression language — the same one used by [VS Code's when-clause contexts](https://code.visualstudio.com/api/references/when-clause-contexts) — evaluated against a reactive context object.

The evaluator is powered by [`whenexpr`](https://github.com/antfu/whenexpr), which also provides the `WhenExpression<Ctx, S>` type helper used by `defineCommand` / `defineDockEntry` for compile-time validation (see [Type-safe `when` clauses](#type-safe-when-clauses)).

## Usage

### On Commands

Controls whether the command appears in the palette and whether it can be triggered via shortcuts:

```ts
ctx.commands.register(defineCommand({
  id: 'my-plugin:embedded-only',
  title: 'Embedded-Only Action',
  when: 'clientType == embedded',
  handler: async () => { /* ... */ },
}))
```

### On Dock Entries

Controls whether a dock entry is visible in the dock bar:

```ts
ctx.docks.register(defineDockEntry({
  id: 'my-plugin:inspector',
  title: 'Inspector',
  type: 'action',
  icon: 'ph:cursor-duotone',
  when: 'clientType == embedded',
  action: { importFrom: 'my-plugin/inspector' },
}))
```

Set `when: 'false'` to unconditionally hide a dock entry.

## Expression Syntax

### Operators

| Category    | Operators                        | Example                          |
| ----------- | -------------------------------- | -------------------------------- |
| Bare truthy | identifier                       | `dockOpen`                       |
| Literals    | `true`, `false`, numbers, strings | `true`, `42`, `'dev'`            |
| Unary       | `!`, `-`, `+`                    | `!paletteOpen`                   |
| Logical     | `&&`, `\|\|`                     | `dockOpen && !paletteOpen`       |
| Equality    | `==`, `!=`, `===`, `!==`         | `clientType == embedded`         |
| Relational  | `<`, `<=`, `>`, `>=`             | `count >= 10`                    |
| Arithmetic  | `+`, `-`, `*`, `/`, `%`          | `(a + b) * c`                    |
| Grouping    | `( … )`                          | `(a \|\| b) && c`                |

### Precedence (low to high)

`||` → `&&` → equality → relational → `+ -` → `* / %` → unary → primary

### `==` vs `===`

- **`==` / `!=`** — VS Code when-clause idiom. Right-hand side is a single value token (bare identifier, quoted string, number, or boolean) and comparison is done as a string.
  ```ts
  evaluateWhen('clientType == embedded', ctx)
  ```
- **`===` / `!==`** — JavaScript strict equality. Both sides are full expressions, no coercion.
  ```ts
  evaluateWhen('count === 1', { count: 1 }) // true
  evaluateWhen('count === 1', { count: '1' }) // false
  ```

### Examples

```ts
// Always visible
when: 'true'

// Never visible (unconditionally hidden)
when: 'false'

// Only in embedded mode
when: 'clientType == embedded'

// Only when dock is open and palette is closed
when: 'dockOpen && !paletteOpen'

// Compound with parentheses
when: '(clientType == embedded && dockOpen) || clientType == standalone'

// Plugin-specific context
when: 'vite.mode == development'
```

## Built-in Context Variables

| Variable | Type | Description |
|----------|------|-------------|
| `clientType` | `'embedded' \| 'standalone'` | Current client mode. `embedded` when running inside the host app overlay, `standalone` in a separate window. |
| `dockOpen` | `boolean` | Whether the dock panel is currently open |
| `paletteOpen` | `boolean` | Whether the command palette is currently open |
| `dockSelectedId` | `string` | ID of the currently selected dock entry. Empty string `''` (falsy) when no dock is selected. |

## Namespaced Context Keys

Plugins can register context variables using namespaced keys with `.` or `:` separators to avoid collisions:

```ts
// Flat key (recommended)
context['vite.mode'] = 'development'
context['vite:buildMode'] = 'lib'

// Nested object (also supported)
context.vite = { mode: 'development', ssr: true }
```

Both styles can be used in `when` expressions:

```ts
when: 'vite.mode == development'
when: 'vite:buildMode == lib'
when: 'vite.ssr'
```

### Lookup Order

When resolving a namespaced key like `vite.mode`:

1. **Exact match** — looks for `ctx['vite.mode']` first
2. **Nested path** — falls back to `ctx.vite?.mode`

Flat keys take priority over nested objects if both exist.

::: tip Naming Convention
Use your plugin name as a namespace prefix: `my-plugin.featureEnabled`, `rolldown:buildStep`, etc. This prevents collisions between unrelated plugins.
:::

## Type-safe `when` clauses

`defineCommand` and `defineDockEntry` capture the `when:` string as a TypeScript literal and validate it against `WhenContext` through [`whenexpr`](https://github.com/antfu/whenexpr)'s `WhenExpression<Ctx, S>` helper. Syntax errors surface as compile-time errors at the call site — no runtime check needed.

```ts
import { defineCommand } from '@vitejs/devtools-kit'

defineCommand({
  id: 'my-plugin:toggle',
  title: 'Toggle',
  when: 'dockOpen && !paletteOpen', // ✓ ok
  handler: async () => { /* ... */ },
})

defineCommand({
  id: 'my-plugin:broken',
  title: 'Broken',
  when: 'dockOpen &&& !paletteOpen',
  //    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Type error: syntax error
  handler: async () => { /* ... */ },
})
```

### Key validation with plugin-specific contexts

The default `WhenContext` uses `[key: string]: unknown` so that plugins can add any namespaced key. A consequence is that the type checker only validates **syntax** — it cannot flag a typo like `'dockOpn == embedded'`.

If you want key validation for your own plugin, define a narrower context shape and build a plugin-specific `define*` wrapper:

```ts
import type { WhenContext, WhenExpression } from '@vitejs/devtools-kit'

interface MyPluginContext extends Omit<WhenContext, keyof any> {
  'clientType': 'embedded' | 'standalone'
  'dockOpen': boolean
  'paletteOpen': boolean
  'dockSelectedId': string
  'my-plugin.featureEnabled': boolean
}

function defineMyCommand<const W extends string>(cmd: {
  id: string
  title: string
  when?: WhenExpression<MyPluginContext, W>
  handler: (...args: any[]) => Promise<unknown>
}): typeof cmd {
  return cmd
}

defineMyCommand({
  id: 'my-plugin:toggle',
  title: 'Toggle',
  when: 'my-plugin.featureEnabled && dockOpen', // ✓ ok
  handler: async () => { /* ... */ },
})

defineMyCommand({
  id: 'my-plugin:broken',
  title: 'Broken',
  when: 'my-plugin.featureEnable', // ← typo
  //    ^^^^^^^^^^^^^^^^^^^^^^^^^^^ Type error: Unknown context key
  handler: async () => { /* ... */ },
})
```

## API Reference

The when-clause evaluator is re-exported from `@vitejs/devtools-kit`:

```ts
import type { WhenContext } from '@vitejs/devtools-kit'
import { evaluateWhen, resolveContextValue } from '@vitejs/devtools-kit/utils/when'

const ctx: WhenContext = {
  'clientType': 'embedded',
  'dockOpen': true,
  'paletteOpen': false,
  'dockSelectedId': 'my-dock',
  'vite.mode': 'development',
}

evaluateWhen('dockOpen && vite.mode == development', ctx) // true
evaluateWhen('clientType == standalone', ctx) // false

resolveContextValue('vite.mode', ctx) // 'development'
resolveContextValue('dockOpen', ctx) // true
```

### `evaluateWhen(expression, ctx, options?)`

Evaluates a when-clause expression string against a context object. Returns `boolean`. Pass `{ strict: true }` in `options` to throw when an unknown context key is encountered (useful for catching typos during development).

### `resolveContextValue(key, ctx)`

Resolves a single context key (including namespaced keys) from the context object. Returns `unknown`.

### `WhenContext`

The context interface with built-in variables and an index signature for custom keys:

```ts
interface WhenContext {
  clientType: 'embedded' | 'standalone'
  dockOpen: boolean
  paletteOpen: boolean
  dockSelectedId: string
  [key: string]: unknown // custom plugin variables
}
```

### `WhenExpression<Ctx, S>`

Branded expression type re-exported from `whenexpr`. Use it to build your own typed `define*` helpers — see [Key validation with plugin-specific contexts](#key-validation-with-plugin-specific-contexts) above.
