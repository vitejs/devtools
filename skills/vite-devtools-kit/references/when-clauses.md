# When Clauses

Conditional expressions controlling visibility and activation of commands and dock entries. The evaluator is powered by [`whenexpr`](https://github.com/antfu/whenexpr) (same language as VS Code when-clauses).

## Usage

### On Commands

Controls whether the command appears in the palette and can be triggered via shortcuts:

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

| Category    | Operators                        | Example                         |
| ----------- | -------------------------------- | ------------------------------- |
| Bare truthy | identifier                       | `dockOpen`                      |
| Literals    | `true`, `false`, numbers, strings | `true`, `42`, `'dev'`           |
| Unary       | `!`, `-`, `+`                    | `!paletteOpen`                  |
| Logical     | `&&`, `\|\|`                     | `dockOpen && !paletteOpen`      |
| Equality    | `==`, `!=`, `===`, `!==`         | `clientType == embedded`        |
| Relational  | `<`, `<=`, `>`, `>=`             | `count >= 10`                   |
| Arithmetic  | `+`, `-`, `*`, `/`, `%`          | `(a + b) * c`                   |
| Grouping    | `( … )`                          | `(a \|\| b) && c`               |

### Precedence (low to high)

`||` → `&&` → equality → relational → `+ -` → `* / %` → unary → primary

### `==` vs `===`

- **`==` / `!=`** — VS Code when-clause idiom. Right-hand side is a single value token; comparison stringified.
- **`===` / `!==`** — JavaScript strict equality; both sides are full expressions, no coercion.

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
| `clientType` | `'embedded' \| 'standalone'` | Current client mode |
| `dockOpen` | `boolean` | Whether the dock panel is currently open |
| `paletteOpen` | `boolean` | Whether the command palette is currently open |
| `dockSelectedId` | `string` | ID of the currently selected dock entry. Empty string (falsy) when none selected. |

## Namespaced Context Keys

Plugins can register context variables using namespaced keys with `.` or `:` separators:

```ts
// Flat key (recommended)
context['vite.mode'] = 'development'
context['vite:buildMode'] = 'lib'

// Nested object (also supported)
context.vite = { mode: 'development', ssr: true }
```

Both styles work in `when` expressions:

```ts
when: 'vite.mode == development'
when: 'vite:buildMode == lib'
when: 'vite.ssr'
```

### Lookup Order

When resolving a namespaced key like `vite.mode`:

1. **Exact match** — looks for `ctx['vite.mode']` first
2. **Nested path** — falls back to `ctx.vite?.mode`

Flat keys take priority over nested objects if both exist. Use your plugin name as namespace prefix: `my-plugin.featureEnabled`, `rolldown:buildStep`.

## Type-safe `when` clauses

`defineCommand` / `defineDockEntry` capture the literal `when:` string and validate it against `WhenContext` through [`whenexpr`](https://github.com/antfu/whenexpr)'s `WhenExpression<Ctx, S>` helper. Syntax errors surface as compile-time errors at the call site.

```ts
defineCommand({
  id: 'x', title: 'x',
  when: 'dockOpen &&& !paletteOpen',
  //    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Type error: syntax error
  handler: async () => {},
})
```

### Key validation with plugin-specific contexts

The default `WhenContext` uses `[key: string]: unknown`, so the type checker only flags **syntax** errors (not unknown-key typos). To get key validation, build a plugin-specific `define*` wrapper with a narrower context type:

```ts
import type { WhenContext, WhenExpression } from '@vitejs/devtools-kit'

interface MyPluginContext {
  clientType: 'embedded' | 'standalone'
  dockOpen: boolean
  paletteOpen: boolean
  dockSelectedId: string
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
```

## API Reference

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

Evaluates a when-clause expression string against a context object. Returns `boolean`. Pass `{ strict: true }` in `options` to throw on unknown context keys.

### `resolveContextValue(key, ctx)`

Resolves a single context key (including namespaced keys) from the context object. Returns `unknown`.

### `WhenContext`

```ts
interface WhenContext {
  clientType: 'embedded' | 'standalone'
  dockOpen: boolean
  paletteOpen: boolean
  dockSelectedId: string
  [key: string]: unknown // custom plugin variables
}
```
