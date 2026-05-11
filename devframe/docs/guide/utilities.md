---
outline: deep
---

# Utilities

Devframe ships a set of small, stable helpers under the `devframe/utils/*` subpaths. They cover the most common ancillary tasks a devtool needs — colorising terminal output, hashing arbitrary values, opening files in an editor — without forcing every author to pick (and install) their own library.

Each helper is bundled inside devframe. Importing from `devframe/utils/*` is enough — there's no separate `npm install` for these dependencies.

## Reference

### `devframe/utils/colors`

Terminal ANSI colors. Each entry is callable as a plain function or as a tagged template.

```ts
import { colors as c } from 'devframe/utils/colors'

console.log(c.green('Server ready'))
console.log(c.cyan`listening on port ${port}`)
console.log(`${c.bold(c.red('fatal:'))} something went wrong`)
```

Exports `colors` (`blue`, `cyan`, `gray`, `green`, `red`, `yellow`, `bold`, `dim`, `reset`, `underline`).

### `devframe/utils/open`

Open a URL, file, or other target in the OS default handler.

```ts
import { open } from 'devframe/utils/open'

await open('https://localhost:7777')
await open('./report.html', { wait: true })
```

### `devframe/utils/launch-editor`

Open a file in the user's editor. Target accepts `file`, `file:line`, or `file:line:column`. Pass an optional editor command (e.g. `'code'`, `'subl'`) to override the auto-detected editor.

```ts
import { launchEditor } from 'devframe/utils/launch-editor'

launchEditor('src/main.ts:42:7')
launchEditor('src/main.ts:42:7', 'code')
```

The auto-detection reads the `LAUNCH_EDITOR` environment variable and falls back to common defaults. Most devframes consume this through the prebuilt `openInEditor` recipe — see [Open helpers](./standalone-cli#open-helpers).

### `devframe/utils/hash`

Stable, deterministic hash of any structured-cloneable value. Useful for cache keys and dedup.

```ts
import { hash } from 'devframe/utils/hash'

const key = hash({ functionName, args })
```

### `devframe/utils/structured-clone`

JSON-safe serialization for the structured-clone algorithm — round-trips `Map`, `Set`, `Date`, `BigInt`, cycles, and class instances. Used internally by the RPC wire format; exposed for tools that need the same encoding.

```ts
import {
  structuredCloneDeserialize,
  structuredCloneParse,
  structuredCloneSerialize,
  structuredCloneStringify,
} from 'devframe/utils/structured-clone'

const wire = structuredCloneStringify(new Map([['a', 1]]))
const value = structuredCloneParse<Map<string, number>>(wire)
```

### `devframe/utils/human-id`

Generate a human-readable, lowercase, dash-separated random ID.

```ts
import { humanId } from 'devframe/utils/human-id'

humanId() // 'bright-orange-tiger'
```

### `devframe/utils/nanoid`

Tiny URL-safe random ID generator (vendored, no runtime dependency).

```ts
import { nanoid } from 'devframe/utils/nanoid'

nanoid() // 21 chars
nanoid(10) // 10 chars
```

### `devframe/utils/promise`

Promise constructor with externally-controlled resolution.

```ts
import { promiseWithResolver } from 'devframe/utils/promise'

const { promise, resolve, reject } = promiseWithResolver<number>()
```

### `devframe/utils/events`

Generic typed event emitter — `on(event, cb)` returns an unsubscribe function. Used as the eventing primitive across devframe's hosts.

```ts
import { createEventEmitter } from 'devframe/utils/events'

const events = createEventEmitter<{ change: (n: number) => void }>()
const off = events.on('change', n => console.log(n))
events.emit('change', 42)
off()
```

### `devframe/utils/shared-state`

Underlying immutable state container used by `ctx.rpc.sharedState`. Most devframes interact with it indirectly — see [Shared State](./shared-state). Available directly when you need a state hub outside the RPC host.

```ts
import { createSharedState } from 'devframe/utils/shared-state'

const state = createSharedState({ initialValue: { count: 0 } })
state.mutate((draft) => {
  draft.count += 1
})
state.value() // { count: 1 }
```

### `devframe/utils/streaming-channel`

Low-level sink/reader primitives for streamed RPC payloads. Most devframes consume these through `ctx.rpc.streaming` — see [Streaming](./streaming).

### `devframe/utils/when`

Statically-validated when-clause expressions for conditional UI visibility. The runtime + types ship from here; the consumer fields (`when` on docks and commands) are kit-side. See [When Clauses](./when-clauses).

## Why a `utils/*` subpath

The utilities are exposed as **stable wrappers over their underlying libraries** rather than bare re-exports. Two consequences:

- **One install.** Consumers do not list these libraries in their own `package.json`. Bundling them inside devframe means version drift across devtools is impossible.
- **Swappable internals.** The wrapper signatures are deliberately narrower than upstream. Devframe can change the implementation (`ansis` → `picocolors`, `ohash` → `crypto.subtle.digest`, …) without a breaking change to dependent devtools.

When you need a feature outside the wrapper's minimal surface, prefer extending the wrapper inside devframe over bypassing it.
