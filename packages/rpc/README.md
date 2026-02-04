# @vitejs/devtools-rpc

DevTools RPC for Vite, featuring extensible [birpc](https://github.com/antfu-collective/birpc) interfaces with advanced type-safe function definitions.

## Features

- **Type-safe function definitions** with automatic type inference
- **Dynamic function registration** with hot updates
- **User-provided function context** for setup and handlers
- **Schema validation** via [`valibot`](https://valibot.dev)
- **Cache Manager** for RPC result caching
- **Dump feature** for pre-computing results (static hosting, testing, offline mode)
- **Basic RPC Client/Server** built on birpc
- **WebSocket Presets** ready-to-use transport presets

## Installation

```bash
pnpm install @vitejs/devtools-rpc
```

## Usage

### Basic RPC Client/Server

```ts
import { createRpcClient } from '@vitejs/devtools-rpc/client'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/client'
import { createRpcServer } from '@vitejs/devtools-rpc/server'
```

### Defining Functions

Use `defineRpcFunction` to create type-safe RPC function definitions:

```ts
import { defineRpcFunction } from '@vitejs/devtools-rpc'

// Simple function
const greet = defineRpcFunction({
  name: 'greet',
  handler: (name: string) => `Hello, ${name}!`
})
```

You can provide a context to functions for setup and initialization:

```ts
import { defineRpcFunction } from '@vitejs/devtools-rpc'

// With setup and context
const getUser = defineRpcFunction({
  name: 'getUser',
  setup: (context) => {
    console.log(context)
    return {
      handler: (id: string) => context.users[id]
    }
  }
})
```

#### Schema Validation

Use Valibot schemas for automatic argument and return value validation:

```ts
import { defineRpcFunction } from '@vitejs/devtools-rpc'
import * as v from 'valibot'

const add = defineRpcFunction({
  name: 'add',
  args: [v.number(), v.number()] as const,
  returns: v.number(),
  handler: (a, b) => a + b // Types are automatically inferred
})
```

### Function Collector

`RpcFunctionsCollector` manages dynamic function registration and provides a type-safe proxy for accessing functions:

```ts
import { defineRpcFunction, RpcFunctionsCollectorBase } from '@vitejs/devtools-rpc'

// Provide a custom context to the collector
const collector = new RpcFunctionsCollectorBase({ users: [/* ... */] })

// Register functions
collector.register(defineRpcFunction({
  name: 'greet',
  handler: (name: string) => `Hello, ${name}!`,
}))
collector.register(defineRpcFunction({
  name: 'getUser',
  setup: (context) => {
    return {
      handler: (id: string) => context.users.find((user: { id: string }) => user.id === id)
    }
  }
}))

// Access via proxy
await collector.functions.greet('Alice') // "Hello, Alice!"

// Listen for changes
const unsubscribe = collector.onChanged((fnName) => {
  console.log(`Function ${fnName} changed`)
})
```

### Dump Feature

The dump feature allows pre-computing RPC results for static hosting, testing, or offline mode. This is useful for static sites or when you want to avoid runtime computation.

```ts
import { createClientFromDump, defineRpcFunction, dumpFunctions } from '@vitejs/devtools-rpc'

// Define functions with dump configurations
const greet = defineRpcFunction({
  name: 'greet',
  handler: (name: string) => `Hello, ${name}!`,
  dump: {
    inputs: [
      ['Alice'],
      ['Bob'],
      ['Charlie']
    ],
    fallback: 'Hello, stranger!'
  }
})

// Collect pre-computed results
const store = await dumpFunctions([greet])

// Create a client that serves from the dump store
const client = createClientFromDump(store)

await client.greet('Alice') // Returns pre-computed: "Hello, Alice!"
await client.greet('Unknown') // Returns fallback: "Hello, stranger!"
```

Functions with `type: 'static'` automatically get dumped with empty arguments if no dump configuration is provided.

#### Pre-computed Records

You can provide pre-computed records directly to bypass function execution:

```ts
import { defineRpcFunction } from '@vitejs/devtools-rpc'

const multiply = defineRpcFunction({
  name: 'multiply',
  handler: (a: number, b: number) => a * b,
  dump: {
    records: [
      { inputs: [2, 3], output: 6 },
      { inputs: [4, 5], output: 20 },
    ],
  },
})
```

You can also mix computed (`inputs`) and pre-computed (`records`) in the same dump configuration.

#### Parallel Execution

Enable parallel processing for faster dump collection:

```ts
import { dumpFunctions } from '@vitejs/devtools-rpc'

// Enable parallel with default concurrency of 5
const store = await dumpFunctions([greet], context, {
  concurrency: true
})

// Or specify a custom concurrency limit
const store = await dumpFunctions([greet], context, {
  concurrency: 10 // Limit to 10 concurrent executions
})
```

Set `concurrency` to `true` for parallel execution (default limit: 5) or a number to specify the exact concurrency limit.

## Package Exports

- **`.`** - Type-safe function definitions and utilities (main export)
  - `RpcFunctionsCollectorBase`, `defineRpcFunction`, `createDefineWrapperWithContext`
  - `dumpFunctions`, `createClientFromDump`, `RpcCacheManager`
  - Type definitions and utilities

- **`./client`** - RPC client
  - `createRpcClient`

- **`./server`** - RPC server
  - `createRpcServer`

- **`./presets`** - RPC presets
  - `defineRpcClientPreset`, `defineRpcServerPreset`

- **`./presets/ws/client`** - WebSocket client preset
  - `createWsRpcPreset`

- **`./presets/ws/server`** - WebSocket server preset
  - `createWsRpcPreset`

## Examples

See [src/examples](./src/examples) and [test files](./src) for complete integration examples.

## License

MIT License © [VoidZero Inc.](https://github.com/vitejs)
