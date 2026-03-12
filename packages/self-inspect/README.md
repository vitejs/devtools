# @vitejs/devtools-self-inspect

A Vite DevTools plugin for inspecting the DevTools itself. Useful when developing or debugging DevTools plugins built with `@vitejs/devtools-kit`.

## Features

- List all registered RPC functions with their metadata (type, schema, cacheability, etc.)
- List all registered dock entries
- List all registered client scripts
- List all Vite plugins with DevTools support and their capabilities

## Installation

```bash
pnpm add -D @vitejs/devtools-self-inspect
```

## Usage

Add the plugin to your Vite config:

```ts
import { DevToolsSelfInspect } from '@vitejs/devtools-self-inspect'
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  devtools: true,
  plugins: [
    DevToolsSelfInspect(),
  ],
})
```

A "Self Inspect" panel will appear in the DevTools dock, giving you a live view of the registered RPC functions, docks, client scripts, and DevTools-enabled plugins.
