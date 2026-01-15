---
outline: deep
---

# Shared State

The DevTools Kit provides a built-in shared state system that enables you to share data between the server and client with automatic synchronization.

## Server-Side Usage

On the server side, you can get the shared state using `ctx.rpc.sharedState.get(name, options)`:

```ts {6-10}
export default function myPlugin(): Plugin {
  return {
    name: 'my-plugin',
    devtools: {
      async setup(ctx) {
        // Get the shared state
        const state = await ctx.rpc.sharedState.get('my-plugin:state', {
          initialValue: {
            count: 0,
            name: 'John Doe',
          },
        })

        // Use .value() to get the current state
        console.log(state.value()) // { count: 0, name: 'John Doe' }

        setTimeout(() => {
          // Mutate the shared state, changes will be automatically synchronized to all the connected clients
          state.mutate((state) => {
            state.count += 1
          })
        }, 1000)
      },
    },
  }
}
```

## Type-Safe Shared State

The shared state is type-safe, you can get the state with the type of the initial value. To do so, you need to extend the `DevToolsRpcSharedStates` interface in your plugin's type definitions.

```ts [src/types.ts]
import '@vitejs/devtools-kit'

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcSharedStates {
    'my-plugin:state': { count: number, name: string }
  }
}
```

## Client-Side Usage

On the client side, you can get the shared state using `client.rpc.sharedState.get(name)`:

```ts {6-10}
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'

const client = await getDevToolsRpcClient()

const state = await client.rpc.sharedState.get('my-plugin:state')

console.log(state.value()) // { count: 0, name: 'John Doe' }

// Use .on('updated') to subscribe to changes
state.on('updated', (newState) => {
  console.log(newState) // { count: 1, name: 'John Doe' }
})
```

## Framework Integration

For example, if you use Vue, you can wrap it into a reactive ref:

```ts {6-10}
import { shallowRef } from 'vue'

const sharedState = await client.rpc.sharedState.get('my-plugin:state')
const state = shallowRef(sharedState.value())
sharedState.on('updated', (newState) => {
  state.value = newState
})

// Now the `state` ref will be updated automatically when the shared state changes
```
