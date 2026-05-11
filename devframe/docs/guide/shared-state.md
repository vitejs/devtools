---
outline: deep
---

# Shared State

Shared state is observable, immutable-by-default state synced between the server and every connected client. Mutate a draft, and Devframe computes the patches to broadcast.

Shared state survives reconnects — a newly connected client receives the current snapshot before any further updates. Use it for anything that should stay reactive.

## Overview

```mermaid
flowchart LR
  subgraph ClientA["Client A"]
    A["state.value()"]
  end
  subgraph Server["Server"]
    S["state.mutate(fn)"]
  end
  subgraph ClientB["Client B"]
    B["state.value()"]
  end
  S <-->|RPC sync| A
  S <-->|RPC sync| B
```

## Creating state

Use `ctx.rpc.sharedState.get(key, options)` in your `setup`:

```ts
import { defineDevframe } from 'devframe'

export default defineDevframe({
  id: 'my-devframe',
  name: 'My Devframe',
  async setup(ctx) {
    const state = await ctx.rpc.sharedState.get('my-devframe:state', {
      initialValue: {
        count: 0,
        items: [] as { id: string, name: string }[],
      },
    })

    console.log(state.value().count) // 0
  },
})
```

Namespace keys with `<devframe-id>:<key>` to avoid collisions when multiple devframes share a host.

## Reading

`state.value()` returns an immutable snapshot:

```ts
const current = state.value()
console.log(current.count)
// current.count = 1 // ✗ TypeScript error — snapshot is Immutable<T>
```

## Mutating

Pass a recipe function to `state.mutate()`:

```ts
state.mutate((draft) => {
  draft.count += 1
  draft.items.push({ id: 'a', name: 'Alpha' })
})
```

Under the hood, Devframe:

1. Applies the recipe to a draft of the current state, producing a new immutable snapshot.
2. Emits an `updated` event with the new state (and `SharedStatePatch[]`, if enabled).
3. Broadcasts the update to all connected clients.

Mutations are idempotent across replay — Devframe tracks a `syncIds` set internally so a patch round-tripped back from a client applies once.

## Patches (advanced)

Enable patches for minimal network diffs instead of full snapshots:

```ts
const state = await ctx.rpc.sharedState.get('my-devframe:big-state', {
  initialValue: largeTree,
  // sharedState-level enablePatches is opt-in:
  sharedState: createSharedState({ initialValue: largeTree, enablePatches: true }),
})
```

With patches enabled, the `updated` event carries a `Patch[]` alongside the new state so listeners can apply incremental updates.

## Subscribing

```ts
state.on('updated', (fullState, patches, syncId) => {
  // `patches` is populated only when enablePatches is set.
})
```

## Client-side access

The same key is available on the RPC client in the browser:

```ts
import { connectDevframe } from 'devframe/client'

const rpc = await connectDevframe()

const state = await rpc.sharedState.get('my-devframe:state')

console.log(state.value().count)

state.mutate((draft) => {
  draft.count += 1
})
```

Client-side mutations round-trip through the server before reappearing locally, so `state.value()` always reflects the authoritative source.

## Enumerating keys

Both server and client hosts expose `keys()` and `onKeyAdded`:

```ts
for (const key of ctx.rpc.sharedState.keys()) {
  console.log(key)
}

const unsubscribe = ctx.rpc.sharedState.onKeyAdded((key) => {
  console.log('new shared-state key:', key)
})
```

Protocol adapters (the [MCP adapter](./agent-native), for example) use this to surface shared state as dynamic resources.

## When to use shared state vs RPC

| Use shared state for | Use RPC for |
|----------------------|-------------|
| Long-lived UI state (selections, filters, expanded nodes) | One-shot queries (`get-modules`, `read-file`) |
| Cross-client coordination | Commands / actions with side effects |
| Data that should reappear after reconnect | Event streams (prefer `broadcast` / `callEvent`) |

For short-lived actions and events, use `ctx.rpc.register` + `ctx.rpc.broadcast` from the [RPC](./rpc) page.
