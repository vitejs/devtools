---
outline: deep
---

# Remote Procedure Calls (RPC)

The DevTools Kit provides a built-in RPC (Remote Procedure Call) layer that enables bidirectional communication between the server (Node.js) and client (browser) with full type safety. This allows you to:

- **[Call server functions from client](#call-server-functions-from-client)**: Fetch data, trigger actions, or query server state
- **[Call client functions from server](#call-client-functions-from-server)**: Broadcast updates, trigger UI changes, or collect client-side data
- **Type-safe communication**: Full TypeScript support for all RPC functions

## Register Server-Side RPC Functions

Server-side RPC functions are functions that run on the Node.js server and can be called from the client. To register a server-side RPC function, use `ctx.rpc.register()` with a function definition created by `defineRpcFunction`.

```ts {6-20}
import { defineRpcFunction } from '@vitejs/devtools-kit'

export default function myPlugin(): Plugin {
  return {
    name: 'my-plugin',
    devtools: {
      setup(ctx) {
        const getData = defineRpcFunction({
          name: 'my-plugin:get-data',
          type: 'query', // 'query' | 'action' | 'static'
          setup: (context) => {
            return {
              handler: async (id: string) => {
                // Access context.docks, context.views, context.utils, etc.
                return { id, data: 'some data' }
              },
            }
          },
        })

        ctx.rpc.register(getData)
      },
    },
  }
}
```

**RPC Function Types:**
- `'query'`: For functions that fetch data (can be cached)
- `'action'`: For functions that perform actions or side effects
- `'static'`: For functions that return static data

The `setup` function receives the `DevToolsNodeContext` which provides access to:

- `context.docks`: Manage [dock entries](./dock-system)
- `context.views`: Host static views (see [Dock System](./dock-system))
- `context.rpc`: Register more RPC functions or [broadcast to clients](#call-client-functions-from-server)
- `context.utils`: Utility functions
- `context.viteConfig`: Vite configuration
- `context.viteServer`: Vite dev server (in dev mode)
- `context.mode`: Current mode (`'dev'` or `'build'`)

## Call Server Functions from Client

In your client-side code ([iframe pages](./dock-system#register-a-dock-entry), [action scripts](./dock-system#register-an-action), or [custom renderers](./dock-system#register-custom-renderer)), you can call server-side RPC functions using the RPC client.

First, get the RPC client:

```ts
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'

const rpc = await getDevToolsRpcClient()
```

Then call server functions:

```ts
// Call a server function
const data = await rpc.call('my-plugin:get-data', 'some-id')
```

## Register Client-Side RPC Functions

Client-side RPC functions are functions that run in the browser and can be called from the server. This is useful for broadcasting updates or triggering UI changes.

To register a client-side RPC function, use `rpc.client.register()` in your client code (e.g., in [action scripts](./dock-system#register-an-action) or [custom renderers](./dock-system#register-custom-renderer)):

```ts [src/vite-devtools-action.ts]
import type { DevToolsRpcClientFunctions } from '@vitejs/devtools-kit'
import type { DevToolsClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setupDevToolsAction(ctx: DevToolsClientScriptContext) {
  // Register a client-side RPC function
  ctx.current.rpc.client.register({
    name: 'my-plugin:client-update' satisfies keyof DevToolsRpcClientFunctions,
    type: 'action',
    handler: (data: { message: string }) => {
      console.log('Received update from server:', data.message)
      // Update UI, trigger actions, etc.
    },
  })
}
```

**Important**: You need to extend the `DevToolsRpcClientFunctions` interface in your plugin's type definitions so TypeScript knows about your client functions:

```ts [src/types.ts]
import '@vitejs/devtools-kit'

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcClientFunctions {
    'my-plugin:client-update': (data: { message: string }) => Promise<void>
  }
}
```

## Call Client Functions from Server

To call client-side functions from the server, use `ctx.rpc.broadcast()` (note: the method name is `broadcast`, which broadcasts to all connected clients):

```ts {6-10}
export default function myPlugin(): Plugin {
  return {
    name: 'my-plugin',
    devtools: {
      setup(ctx) {
        // Broadcast to all connected clients
        ctx.rpc.broadcast('my-plugin:client-update', {
          message: 'Hello from server!'
        })
      },
    },
  }
}
```

The `broadcast` method returns a promise that resolves to an array of results from all clients (some may be `undefined` if the client doesn't implement the function).
