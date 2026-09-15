---
outline: deep
---

# RPC

RPC is how a DevTools integration's Node side and its browser UI talk to each other — type-safe and bidirectional. Define functions on the server with `defineRpcFunction`, then `call()` them from the client.

The full API (schema validation, the client, birpc internals) is documented in the [Devframe RPC guide](https://devfra.me/guide/rpc); this page shows the shapes you reach for from a Vite plugin.

## Define a function

```ts
import { defineRpcFunction } from '@vitejs/devtools-kit'

const getModules = defineRpcFunction({
  name: 'my-plugin:get-modules',
  type: 'query',
  setup: ctx => ({
    handler: async () => [
      { id: '/src/main.ts', size: 1024 },
      { id: '/src/App.vue', size: 2048 },
    ],
  }),
})
```

Register it in `devtools.setup`:

```ts
const plugin: Plugin = {
  devtools: {
    setup(ctx) {
      ctx.rpc.register(getModules)
    },
  },
}
```

Scope every function id with your package prefix and use kebab-case: `my-plugin:get-modules`.

## Function types

| Type | Use for | Cached |
|------|---------|--------|
| `query` | Read operations, fetch data | Yes |
| `static` | Constant data | Indefinitely |
| `action` | Side effects, mutations | No |
| `event` | Notifications without a response | No |

## Call from the client

```ts
import { getDevToolsClientContext } from '@vitejs/devtools-kit/client'

const { rpc } = getDevToolsClientContext()!
const modules = await rpc.call('my-plugin:get-modules')
```

For chunked data — LLM deltas, log lines, build progress, uploads — use [streaming channels](https://devfra.me/guide/streaming) instead of plain functions.
