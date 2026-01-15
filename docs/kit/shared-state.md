---
outline: deep
---

# Shared State

DevTools Kit provides a built-in shared state system for synchronizing data between server and clients. Changes made on either side are automatically propagated to all connected parties.

## Overview

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Client A       │     │     Server       │     │   Client B       │
│                  │     │                  │     │                  │
│  state.value()   │◄────│  state.mutate()  │────►│  state.value()   │
│  { count: 1 }    │     │  { count: 1 }    │     │  { count: 1 }    │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         │                        ▲                        │
         │         WebSocket sync │         WebSocket sync │
         └────────────────────────┴────────────────────────┘
```

## Server-Side Usage

### Creating Shared State

Use `ctx.rpc.sharedState.get()` to create or access shared state:

```ts
const plugin: Plugin = {
  devtools: {
    async setup(ctx) {
      const state = await ctx.rpc.sharedState.get('my-plugin:state', {
        initialValue: {
          count: 0,
          items: [],
          settings: { theme: 'dark' },
        },
      })

      // Read current value
      console.log(state.value())
    // => { count: 0, items: [], settings: { theme: 'dark' } }
    }
  }
}
```

### Reading State

```ts
const state = await ctx.rpc.sharedState.get('my-plugin:state', {
  initialValue: { count: 0 },
})

// Get current value
const current = state.value()
console.log(current.count) // 0
```

### Mutating State

Use `state.mutate()` to update the state. Changes are automatically synced to all clients:

```ts
// Mutate with a function (recommended)
state.mutate((draft) => {
  draft.count += 1
  draft.items.push({ id: 1, name: 'New item' })
})

// The mutation function receives a mutable draft
// Changes are batched and synced automatically
```

### Example: Real-Time Updates

```ts
const plugin: Plugin = {
  devtools: {
    async setup(ctx) {
      const state = await ctx.rpc.sharedState.get('my-plugin:state', {
        initialValue: { modules: [], lastUpdate: 0 },
      })

      // Update state when Vite processes modules
      ctx.viteServer?.watcher.on('change', (file) => {
        state.mutate((draft) => {
          draft.modules.push(file)
          draft.lastUpdate = Date.now()
        })
      })
    }
  }
}
```

## Client-Side Usage

### Accessing Shared State

Use `client.rpc.sharedState.get()` to access the shared state:

```ts
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'

const client = await getDevToolsRpcClient()

const state = await client.rpc.sharedState.get('my-plugin:state')

// Read current value
console.log(state.value())
```

### Subscribing to Changes

Use `state.on('updated', ...)` to react to state changes:

```ts
const state = await client.rpc.sharedState.get('my-plugin:state')

// Initial value
console.log(state.value()) // { count: 0 }

// Subscribe to updates
state.on('updated', (newState) => {
  console.log('State updated:', newState)
  // { count: 1 } - after server mutation
})
```

## Framework Integration

### Vue

Create a reactive ref that syncs with shared state:

```ts
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { shallowRef } from 'vue'

export async function useSharedState<T>(name: string) {
  const client = await getDevToolsRpcClient()
  const sharedState = await client.rpc.sharedState.get<T>(name)

  const state = shallowRef(sharedState.value())

  sharedState.on('updated', (newState) => {
    state.value = newState
  })

  return state
}

// Usage in component
const state = await useSharedState('my-plugin:state')
// `state` is now reactive and auto-updates
```

### Vue Composable (Full Example)

```vue
<script setup lang="ts">
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { onMounted, shallowRef } from 'vue'

interface PluginState {
  count: number
  items: string[]
}

const state = shallowRef<PluginState | null>(null)

onMounted(async () => {
  const client = await getDevToolsRpcClient()
  const shared = await client.rpc.sharedState.get<PluginState>('my-plugin:state')

  state.value = shared.value()

  shared.on('updated', (newState) => {
    state.value = newState
  })
})
</script>

<template>
  <div v-if="state">
    <p>Count: {{ state.count }}</p>
    <ul>
      <li v-for="item in state.items" :key="item">
        {{ item }}
      </li>
    </ul>
  </div>
</template>
```

### React

```tsx
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { useEffect, useState } from 'react'

function useSharedState<T>(name: string, fallback: T) {
  const [state, setState] = useState<T>(fallback)

  useEffect(() => {
    let mounted = true

    async function init() {
      const client = await getDevToolsRpcClient()
      const sharedState = await client.rpc.sharedState.get<T>(name)

      if (mounted) {
        setState(sharedState.value() ?? fallback)

        sharedState.on('updated', (newState) => {
          if (mounted) {
            setState(newState)
          }
        })
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [name])

  return state
}

// Usage
function MyComponent() {
  const state = useSharedState('my-plugin:state', { count: 0 })

  return (
    <div>
      Count:
      {state.count}
    </div>
  )
}
```

### Svelte

```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'
  import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'

  interface PluginState {
    count: number
  }

  const state = writable<PluginState>({ count: 0 })

  onMount(async () => {
    const client = await getDevToolsRpcClient()
    const sharedState = await client.rpc.sharedState.get<PluginState>('my-plugin:state')

    state.set(sharedState.value())

    sharedState.on('updated', (newState) => {
      state.set(newState)
    })
  })
</script>

<p>Count: {$state.count}</p>
```

## Type Safety

Extend `DevToolsRpcSharedStates` for type-safe shared state:

```ts
// src/types.ts
import '@vitejs/devtools-kit'

interface MyPluginState {
  count: number
  items: Array<{ id: string, name: string }>
  settings: {
    theme: 'light' | 'dark'
    notifications: boolean
  }
}

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcSharedStates {
    'my-plugin:state': MyPluginState
  }
}
```

Now TypeScript will validate your state access:

```ts
const state = await ctx.rpc.sharedState.get('my-plugin:state', {
  initialValue: {
    count: 0,
    items: [],
    settings: { theme: 'dark', notifications: true },
  },
})

// ✓ Type-checked
state.mutate((draft) => {
  draft.count += 1
  draft.settings.theme = 'light'
})

// ✗ Error: 'invalid' is not assignable to 'light' | 'dark'
state.mutate((draft) => {
  draft.settings.theme = 'invalid'
})
```

## Best Practices

### Use Namespaced Keys

Prefix state keys with your plugin name to avoid collisions:

```ts
// Good
'my-plugin:state'
'my-plugin:settings'

// Bad - may conflict with other plugins
'state'
'settings'
```

### Keep State Serializable

Shared state must be JSON-serializable. Avoid:

<!-- eslint-skip -->

```ts
// ✗ Bad - functions can't be serialized
{
  count: 0,
  increment: () => this.count++
}

// ✗ Bad - circular references
const obj = { child: null }
obj.child = obj

// ✓ Good - plain data
{
  count: 0,
  items: [{ id: 1, name: 'Item' }]
}
```

### Batch Updates

When making multiple changes, use a single `mutate` call:

```ts
// ✓ Good - single sync event
state.mutate((draft) => {
  draft.count += 1
  draft.lastUpdate = Date.now()
  draft.items.push(newItem)
})

// ✗ Bad - multiple sync events
state.mutate((d) => {
  d.count += 1
})
state.mutate((d) => {
  d.lastUpdate = Date.now()
})
state.mutate((d) => {
  d.items.push(newItem)
})
```

### Consider State Size

Large state objects may impact performance. For large datasets, consider:

<!-- eslint-skip -->

```ts
// Instead of storing all data in shared state
{
  allModules: [...thousands of modules...]
}

// Store just IDs and fetch details via RPC
{
  moduleIds: ['a', 'b', 'c'],
  selectedModule: 'a'
}

// Use RPC to fetch full module data
const module = await rpc.call('my-plugin:get-module', state.selectedModule)
```
