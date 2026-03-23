---
outline: deep
---

# Remote Procedure Calls (RPC)

DevTools Kit provides a built-in RPC layer for type-safe bidirectional communication between your Node.js server and browser clients.

## Overview

```mermaid
sequenceDiagram
  participant Client as Browser Client
  participant Server as Node.js Server

  Client->>Server: rpc.call('my-plugin:get-data', id)
  Note over Server: handler: async (id) =><br/>fetchData(id)
  Server->>Client: { id, data: '...' }
```

## Server-Side Functions

### Defining RPC Functions

Use `defineRpcFunction` to create type-safe server functions:

```ts
import { defineRpcFunction } from '@vitejs/devtools-kit'

const getModules = defineRpcFunction({
  name: 'my-plugin:get-modules',
  type: 'query',
  setup: ctx => ({
    handler: async () => {
      // Access DevTools context
      console.log('Mode:', ctx.mode)

      return [
        { id: '/src/main.ts', size: 1024 },
        { id: '/src/App.vue', size: 2048 },
      ]
    },
  }),
})
```

### Naming Convention

Recommended RPC function naming:

1. Scope functions with your package prefix: `<package-name>:...`
2. Use kebab-case for the function part after `:`

Examples:
- `my-plugin:get-modules`
- `my-plugin:read-file`

### Function Types

| Type | Description | Caching | Dump Support |
|------|-------------|---------|--------------|
| `query` | Fetch data, read operations | Can be cached | ✓ (manual) |
| `static` | Constant data that never changes | Cached indefinitely | ✓ (automatic) |
| `action` | Side effects, mutations | Not cached | ✗ |
| `event` | Emit events, no response | Not cached | ✗ |

### Handler Arguments

Handlers can accept any serializable arguments:

```ts
const getModule = defineRpcFunction({
  name: 'my-plugin:get-module',
  type: 'query',
  setup: () => ({
    handler: async (id: string, options?: { includeSource: boolean }) => {
      // id and options are passed from the client
      return { id, source: options?.includeSource ? '...' : undefined }
    },
  }),
})
```

### Context in Setup

The `setup` function receives the full `DevToolsNodeContext`:

```ts
setup: (ctx) => {
  // Access Vite config
  const root = ctx.viteConfig.root

  // Access dev server (if in dev mode)
  const server = ctx.viteServer

  return {
    handler: async () => {
      // Use ctx here too
      return { root, mode: ctx.mode }
    },
  }
}
```

> [!IMPORTANT]
> For build mode compatibility, compute data in the setup function using the context rather than relying on runtime global state. This allows the dump feature to pre-compute results at build time.

### Registering Functions

Register your RPC function in the `devtools.setup`:

```ts
const plugin: Plugin = {
  devtools: {
    setup(ctx) {
      ctx.rpc.register(getModules)
    }
  }
}
```

### Dump Feature for Build Mode

When creating a static DevTools build (via `vite devtools build` CLI or the [`build.withApp`](/guide/#building-with-the-app) plugin option), the server cannot execute functions at runtime. The **dump feature** solves this by pre-computing RPC results at build time.

#### How It Works

1. At build time, `dumpFunctions()` executes your RPC handlers with predefined arguments
2. Results are stored in `.rpc-dump/index.json` in the build output
3. The static client reads from this JSON file instead of making live RPC calls

Dump shard files are written to `.rpc-dump/*.json`. Function names in shard file keys replace `:` with `~` (for example `my-plugin:get-data` -> `my-plugin~get-data`).
Query record maps are embedded directly in `.rpc-dump/index.json`; no per-function index files are generated.

#### Static Functions (Recommended)

Functions with `type: 'static'` are **automatically dumped** with no arguments:

```ts
const getConfig = defineRpcFunction({
  name: 'my-plugin:get-config',
  type: 'static', // Auto-dumped with inputs: [[]]
  setup: ctx => ({
    handler: async () => ({
      root: ctx.viteConfig.root,
      plugins: ctx.viteConfig.plugins.map(p => p.name),
    }),
  }),
})
```

This works in both dev mode (live) and build mode (pre-computed).

#### Query Functions with Dumps

For `query` functions that need arguments, define `dump` in the setup:

```ts
const getModule = defineRpcFunction({
  name: 'my-plugin:get-module',
  type: 'query',
  setup: (ctx) => {
    // Collect all module IDs at build time
    const moduleIds = Array.from(ctx.viteServer?.moduleGraph?.idToModuleMap.keys() || [])

    return {
      handler: async (id: string) => {
        const module = ctx.viteServer?.moduleGraph?.getModuleById(id)
        return module ? { id, size: module.transformResult?.code.length } : null
      },
      dump: {
        inputs: moduleIds.map(id => [id]), // Pre-compute for all modules
        fallback: null, // Return null for unknown modules
      },
    }
  },
})
```

#### Recommendations for Plugin Authors

To ensure your DevTools work in build mode:

1. **Prefer `type: 'static'`** for functions that return constant data
2. **Return context-based data in setup** rather than accessing global state in handlers
3. **Define dumps in setup function** for query functions that need pre-computation
4. **Use fallback values** for graceful degradation when arguments don't match

```ts
// ✓ Good: Returns static data, works in build mode
const getPluginInfo = defineRpcFunction({
  name: 'my-plugin:info',
  type: 'static',
  setup: ctx => ({
    handler: async () => ({
      version: '1.0.0',
      root: ctx.viteConfig.root,
    }),
  }),
})

// ✗ Avoid: Depends on runtime server state
const getLiveMetrics = defineRpcFunction({
  name: 'my-plugin:metrics',
  type: 'query', // No dump - won't work in build mode
  handler: async () => {
    return getCurrentMetrics() // Requires live server
  },
})
```

> [!TIP]
> If your data genuinely needs live server state, use `type: 'query'` without dumps. The function will work in dev mode but gracefully fail in build mode.

### Organization Convention

For plugin-scale RPC modules, we recommend this structure:

General guidelines:

1. Keep function definitions small and focused: one RPC function per file.
2. Use `src/node/rpc/index.ts` as the single composition point for registration and type augmentation.
3. Store plugin-specific runtime options in `src/node/rpc/context.ts` (instead of mutating the base DevTools context object).
4. Use `context.rpc.invokeLocal(...)` for server-side cross-function composition.

Rough file tree:

```text
src/node/rpc/
├─ index.ts                # exports rpcFunctions + module augmentation
├─ context.ts              # WeakMap-backed helpers (set/get shared rpc context)
└─ functions/
   ├─ get-info.ts          # metadata-style query/static function
   ├─ list-files.ts        # list operation, reusable by other functions
   ├─ read-file.ts         # can invoke `list-files` via invokeLocal
   └─ write-file.ts        # mutation-oriented function
```

1. `src/node/rpc/index.ts`
Keep all RPC declarations in one exported list (for example `rpcFunctions`) and centralize type augmentation (`DevToolsRpcServerFunctions`) in the same file.

```ts
// src/node/rpc/index.ts
import type { RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { getInfo } from './functions/get-info'
import { listFiles } from './functions/list-files'
import { readFile } from './functions/read-file'
import '@vitejs/devtools-kit'

export const rpcFunctions = [
  getInfo,
  listFiles,
  readFile,
] as const // use `as const` to allow type inference

export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

declare module '@vitejs/devtools-kit' {
  export interface DevToolsRpcServerFunctions extends ServerFunctions {}
}
```

2. `src/node/rpc/context.ts`
Use a shared context helper (for example `WeakMap`-backed `set/get`) to provide plugin-specific options across RPC functions without mutating the base context shape.

```ts
// src/node/rpc/context.ts
import type { DevToolsNodeContext } from '@vitejs/devtools-kit'

const rpcContext = new WeakMap<DevToolsNodeContext, { targetDir: string }>()

export function setRpcContext(context: DevToolsNodeContext, options: { targetDir: string }) {
  rpcContext.set(context, options)
}

export function getRpcContext(context: DevToolsNodeContext) {
  const value = rpcContext.get(context)
  if (!value)
    throw new Error('Missing RPC context')
  return value
}
```

```ts
// plugin setup
const plugin = {
  devtools: {
    setup(context) {
      setRpcContext(context, { targetDir: 'src' })
      rpcFunctions.forEach(fn => context.rpc.register(fn))
    },
  },
}
```

3. `src/node/rpc/functions/read-file.ts`
For cross-function calls on the server, use `context.rpc.invokeLocal('<package-name>:list-files')` rather than network-style calls.

```ts
// src/node/rpc/functions/read-file.ts
export const readFile = defineRpcFunction({
  name: 'my-plugin:read-file',
  type: 'query',
  dump: async (context) => {
    const files = await context.rpc.invokeLocal('my-plugin:list-files')
    return {
      inputs: files.map(file => [file.path] as [string]),
    }
  },
  setup: () => ({
    handler: async (path: string) => {
      // ...
    },
  }),
})
```

> [!TIP]
> See the [File Explorer example](/kit/examples#file-explorer) for a plugin using RPC functions with dump support, organized following the conventions above.

## Schema Validation (Optional)

The RPC system has built-in support for runtime schema validation using [Valibot](https://valibot.dev). When you provide schemas, TypeScript types are automatically inferred and validation happens at runtime.

```ts
import { defineRpcFunction } from '@vitejs/devtools-kit'
import * as v from 'valibot'

const getModule = defineRpcFunction({
  name: 'my-plugin:get-module',
  type: 'query',
  args: [
    v.string(),
    v.optional(v.object({
      includeSource: v.boolean(),
    })),
  ],
  returns: v.object({
    id: v.string(),
    source: v.optional(v.string()),
  }),
  setup: () => ({
    handler: (id, options) => {
      // Types are automatically inferred from schemas
      // id: string
      // options: { includeSource: boolean } | undefined
      return {
        id,
        source: options?.includeSource ? '...' : undefined,
      }
    },
  }),
})
```

> [!NOTE]
> Schema validation is optional. If you don't provide `args` or `returns` schemas, the RPC system will work without validation and you can use regular TypeScript types instead.

## Client-Side Calls

### In Iframe Pages

Use `getDevToolsRpcClient()` to get the RPC client:

```ts
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'

async function loadData() {
  const rpc = await getDevToolsRpcClient()

  // Call server function
  const modules = await rpc.call('my-plugin:get-modules')

  // With arguments
  const module = await rpc.call('my-plugin:get-module', '/src/main.ts', {
    includeSource: true,
  })
}
```

### In Action/Renderer Scripts

Use `ctx.rpc` from the script context:

```ts
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setup(ctx: DockClientScriptContext) {
  ctx.current.events.on('entry:activated', async () => {
    const data = await ctx.rpc.call('my-plugin:get-modules')
    console.log(data)
  })
}
```

### Global Client Context

Use `getDevToolsClientContext()` to access the client context (`DevToolsClientContext`) from anywhere on the client side. This is set automatically when DevTools initializes in embedded or standalone mode.

```ts
import { getDevToolsClientContext } from '@vitejs/devtools-kit/client'

const ctx = getDevToolsClientContext()
if (ctx) {
  const modules = await ctx.rpc.call('my-plugin:get-modules')
}
```

Returns `undefined` if the context has not been initialized yet.
```

## Client-Side Functions

You can also define functions on the client that the server can call.

### Registering Client Functions

```ts
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setup(ctx: DockClientScriptContext) {
  ctx.rpc.client.register({
    name: 'my-plugin:highlight-element',
    type: 'action',
    handler: (selector: string) => {
      const el = document.querySelector(selector)
      if (el) {
        el.style.outline = '2px solid red'
        setTimeout(() => {
          el.style.outline = ''
        }, 2000)
      }
    },
  })
}
```

### Broadcasting from Server

Use `ctx.rpc.broadcast()` to call client functions from the server:

```ts
const plugin: Plugin = {
  devtools: {
    setup(ctx) {
    // Later, when you want to notify clients...
      ctx.rpc.broadcast({
        method: 'my-plugin:highlight-element',
        args: ['#app'],
      })
    }
  }
}
```

> [!NOTE]
> `broadcast` sends an event-style call to all connected clients and resolves when dispatch completes.

## Type Safety

For full type safety, extend the DevTools Kit interfaces.

### Server Functions

```ts
// src/types.ts
import '@vitejs/devtools-kit'

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcServerFunctions {
    'my-plugin:get-modules': () => Promise<Module[]>
    'my-plugin:get-module': (
      id: string,
      options?: { includeSource: boolean }
    ) => Promise<Module | null>
  }
}

interface Module {
  id: string
  size: number
  source?: string
}
```

### Client Functions

```ts
// src/types.ts
declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcClientFunctions {
    'my-plugin:highlight-element': (selector: string) => void
    'my-plugin:refresh-ui': () => void
  }
}
```

Now TypeScript will autocomplete and validate your RPC calls:

```ts
// ✓ Type-checked
const modules = await rpc.call('my-plugin:get-modules')

// ✓ Argument types validated
const module = await rpc.call('my-plugin:get-module', '/src/main.ts')

// ✗ Error: unknown function name
const data = await rpc.call('my-plugin:unknown')
```

## Complete Example

Here's a complete example with both server and client RPC functions:

::: code-group

```ts [plugin.ts]
/// <reference types="@vitejs/devtools-kit" />
import type { Plugin } from 'vite'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export default function analyticsPlugin(): Plugin {
  const metrics = new Map<string, number>()

  return {
    name: 'analytics',

    transform(code, id) {
      metrics.set(id, code.length)
    },

    devtools: {
      setup(ctx) {
        // Server function: get metrics
        ctx.rpc.register(
          defineRpcFunction({
            name: 'analytics:get-metrics',
            type: 'query',
            setup: () => ({
              handler: async () => Object.fromEntries(metrics),
            }),
          })
        )

        // Broadcast to clients when metrics change
        ctx.viteServer?.watcher.on('change', (file) => {
          ctx.rpc.broadcast({
            method: 'analytics:metrics-updated',
            args: [file],
          })
        })
      },
    },
  }
}
```

```ts [client.ts]
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setup(ctx: DockClientScriptContext) {
  // Register client function
  ctx.rpc.client.register({
    name: 'analytics:metrics-updated',
    type: 'action',
    handler: (file: string) => {
      console.log('File changed:', file)
      refreshUI()
    },
  })

  async function refreshUI() {
    const metrics = await ctx.rpc.call('analytics:get-metrics')
    console.log('Updated metrics:', metrics)
  }
}
```

```ts [types.ts]
import '@vitejs/devtools-kit'

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcServerFunctions {
    'analytics:get-metrics': () => Promise<Record<string, number>>
  }

  interface DevToolsRpcClientFunctions {
    'analytics:metrics-updated': (file: string) => void
  }
}
```

:::
