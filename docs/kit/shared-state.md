---
outline: deep
---

# Shared State

Shared state synchronizes data between the Node side and every connected browser client. A change on either end propagates to all the others, and the value survives reconnects — reach for it instead of RPC when a UI should reactively track server data.

The full reactive API is in the [Devframe shared-state guide](https://devfra.me/guide/shared-state); this page shows the Vite-plugin usage.

## Server side

`ctx.rpc.sharedState.get()` creates or returns a keyed state:

```ts
const plugin: Plugin = {
  devtools: {
    async setup(ctx) {
      const state = await ctx.rpc.sharedState.get('my-plugin:state', {
        initialValue: { count: 0, items: [] as string[] },
      })

      state.value() // read: { count: 0, items: [] }

      state.mutate((draft) => {
        draft.count++
      })
    },
  },
}
```

## Client side

Get the same key from the client context and subscribe to changes:

```ts
import { getDevToolsClientContext } from '@vitejs/devtools-kit/client'

const { rpc } = getDevToolsClientContext()!
const state = await rpc.sharedState.get('my-plugin:state', {
  initialValue: { count: 0, items: [] },
})

state.subscribe((value) => {
  console.log('updated', value)
})
```

Keep values serializable, and namespace keys with your package prefix (`my-plugin:state`).
