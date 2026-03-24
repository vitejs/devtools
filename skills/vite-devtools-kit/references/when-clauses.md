# When Clauses

Conditional expressions controlling visibility and activation of commands and dock entries.

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
ctx.docks.register({
  id: 'my-plugin:inspector',
  title: 'Inspector',
  type: 'action',
  icon: 'ph:cursor-duotone',
  when: 'clientType == embedded',
  action: { importFrom: 'my-plugin/inspector' },
})
```

Set `when: 'false'` to unconditionally hide a dock entry.

## Expression Syntax

### Operators

| Operator | Example | Description |
|----------|---------|-------------|
| bare truthy | `dockOpen` | True if the value is truthy |
| `true` / `false` | `true` | Literal boolean values |
| `!` | `!paletteOpen` | Negation |
| `==` | `clientType == embedded` | Equality (string comparison) |
| `!=` | `clientType != standalone` | Inequality |
| `&&` | `dockOpen && !paletteOpen` | Logical AND |
| `\|\|` | `paletteOpen \|\| dockOpen` | Logical OR |

### Precedence

`||` (lowest) → `&&` → unary `!`

Each `||` branch is evaluated as a chain of `&&` parts: `a && b || c && d` = `(a AND b) OR (c AND d)`.

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

// When a specific dock is selected
when: 'dockSelectedId == my-plugin'

// Plugin-specific context
when: 'vite.mode == development'

// Compound: either in embedded with dock open, or in standalone
when: 'clientType == embedded && dockOpen || clientType == standalone'
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

## API Reference

```ts
import type { WhenContext } from '@vitejs/devtools-kit'
import { evaluateWhen, getContextValue } from '@vitejs/devtools-kit/utils/when'

const ctx: WhenContext = {
  'clientType': 'embedded',
  'dockOpen': true,
  'paletteOpen': false,
  'dockSelectedId': 'my-dock',
  'vite.mode': 'development',
}

evaluateWhen('dockOpen && vite.mode == development', ctx) // true
evaluateWhen('clientType == standalone', ctx) // false

getContextValue('vite.mode', ctx) // 'development'
getContextValue('dockOpen', ctx) // true
```

### `evaluateWhen(expression, ctx)`

Evaluates a when-clause expression string against a context object. Returns `boolean`.

### `getContextValue(key, ctx)`

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
