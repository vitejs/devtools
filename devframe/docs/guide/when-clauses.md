---
outline: deep
---

# When Clauses

When clauses are conditional expressions that gate the visibility and executability of docks, commands, and any other UI surface you wire them into. The syntax is the same one [VS Code uses for its when-clause contexts](https://code.visualstudio.com/api/references/when-clause-contexts), evaluated against a reactive context object.

The evaluator is provided by the external [`whenexpr`](https://github.com/antfu/whenexpr) package. DevFrame re-exports `evaluateWhen`, `resolveContextValue`, and the `WhenExpression<Ctx, S>` type helper from `devframe/utils/when`.

## Usage

### On Commands

Controls whether the command appears in the palette and whether it can be triggered via shortcuts:

```ts
ctx.commands.register({
  id: 'my-devtool:embedded-only',
  title: 'Embedded-Only Action',
  when: 'clientType == embedded',
  handler: async () => { /* … */ },
})
```

### On Dock Entries

Controls whether a dock is visible in the dock bar:

```ts
ctx.docks.register({
  id: 'my-devtool:inspector',
  title: 'Inspector',
  type: 'action',
  icon: 'ph:cursor-duotone',
  when: 'clientType == embedded',
  action: { importFrom: 'my-devtool/inspector' },
})
```

Set `when: 'false'` to unconditionally hide an entry.

## Expression Syntax

### Operators

| Category | Operators | Example |
|----------|-----------|---------|
| Bare truthy | identifier | `dockOpen` |
| Literals | `true`, `false`, numbers, strings | `true`, `42`, `'dev'` |
| Unary | `!`, `-`, `+` | `!paletteOpen` |
| Logical | `&&`, `\|\|` | `dockOpen && !paletteOpen` |
| Equality | `==`, `!=`, `===`, `!==` | `clientType == embedded` |
| Relational | `<`, `<=`, `>`, `>=` | `count >= 10` |
| Arithmetic | `+`, `-`, `*`, `/`, `%` | `(a + b) * c` |
| Grouping | `( … )` | `(a \|\| b) && c` |

### Precedence (low → high)

`||` → `&&` → equality → relational → `+ -` → `* / %` → unary → primary.

### `==` vs `===`

- **`==` / `!=`** — VS Code when-clause idiom. The right-hand side is a single token (bare identifier, quoted string, number, or boolean); comparison is done as a string.
- **`===` / `!==`** — JavaScript strict equality. Both sides are full expressions, no coercion.

```ts
evaluateWhen('clientType == embedded', ctx) // string-style
evaluateWhen('count === 1', { count: 1 }) // true
evaluateWhen('count === 1', { count: '1' }) // false
```

### Examples

```ts
when: 'true' // always visible
when: 'false' // never visible
when: 'clientType == embedded' // only embedded
when: 'dockOpen && !paletteOpen' // dock open and palette closed
when: '(clientType == embedded && dockOpen) || clientType == standalone'
when: 'my-devtool.ready' // custom plugin context
```

## Built-in Context Variables

| Variable | Type | Description |
|----------|------|-------------|
| `clientType` | `'embedded' \| 'standalone'` | `embedded` when running inside the host app overlay, `standalone` in a separate window. |
| `dockOpen` | `boolean` | Whether the dock panel is currently open. |
| `paletteOpen` | `boolean` | Whether the command palette is currently open. |
| `dockSelectedId` | `string` | ID of the currently selected dock entry. Empty string `''` when none. |

## Namespaced Context Keys

Plugins can add keys using `.` or `:` separators:

```ts
context['my-devtool.ready'] = true
context['my-devtool:step'] = 'build'
context.myDevtool = { ready: true, step: 'build' } // nested form
```

All three work in expressions:

```ts
when: 'my-devtool.ready'
when: 'my-devtool:step == build'
when: 'myDevtool.ready'
```

### Lookup Order

When resolving a key like `my-devtool.ready`:

1. Exact match — `ctx['my-devtool.ready']`
2. Nested path — `ctx['my-devtool']?.ready`

Flat keys win if both exist.

## Type-Safe `when` Clauses

`defineCommand` and `defineDockEntry` capture `when:` as a TypeScript literal and validate it against `WhenContext` via `whenexpr`'s `WhenExpression<Ctx, S>` helper — syntax errors surface at compile time:

```ts
import { defineCommand } from 'devframe'

defineCommand({
  id: 'my-devtool:toggle',
  title: 'Toggle',
  when: 'dockOpen && !paletteOpen', // ✓ ok
  handler: async () => {},
})

defineCommand({
  id: 'my-devtool:broken',
  title: 'Broken',
  when: 'dockOpen &&& !paletteOpen',
  //    ^^^^^^^^^^^^^^^^^^^^^^^^^^^ Type error: syntax error
  handler: async () => {},
})
```

### Key validation with plugin contexts

The default `WhenContext` allows any namespaced key (`[key: string]: unknown`), so the type checker only validates **syntax**. For key-level validation, declare a narrower context and build a typed wrapper:

```ts
import type { WhenContext, WhenExpression } from 'devframe/utils/when'

interface MyPluginContext extends Omit<WhenContext, keyof any> {
  'clientType': 'embedded' | 'standalone'
  'dockOpen': boolean
  'paletteOpen': boolean
  'dockSelectedId': string
  'my-devtool.ready': boolean
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
  id: 'my-devtool:toggle',
  title: 'Toggle',
  when: 'my-devtool.ready && dockOpen', // ✓ ok
  handler: async () => {},
})

defineMyCommand({
  id: 'my-devtool:broken',
  title: 'Broken',
  when: 'my-devtool.read', // ← typo
  //    ^^^^^^^^^^^^^^^^^^^ Type error: Unknown context key
  handler: async () => {},
})
```

## API Reference

```ts
import type { WhenContext } from 'devframe/utils/when'
import { evaluateWhen, resolveContextValue } from 'devframe/utils/when'

const ctx: WhenContext = {
  'clientType': 'embedded',
  'dockOpen': true,
  'paletteOpen': false,
  'dockSelectedId': 'my-dock',
  'my-devtool.ready': true,
}

evaluateWhen('dockOpen && my-devtool.ready', ctx) // true
evaluateWhen('clientType == standalone', ctx) // false

resolveContextValue('my-devtool.ready', ctx) // true
```

### `evaluateWhen(expression, ctx, options?)`

Returns `boolean`. Pass `{ strict: true }` in `options` to throw when the expression references an unknown key — useful in tests to catch typos.

### `resolveContextValue(key, ctx)`

Returns the current value of a single (possibly namespaced) key. Used internally by the evaluator; exposed for integrations that want to surface live context values.

### `WhenExpression<Ctx, S>`

The branded expression type re-exported from `whenexpr`. Use it to build your own typed `define*` helpers — see [Key validation with plugin contexts](#key-validation-with-plugin-contexts) above.
