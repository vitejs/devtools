---
outline: deep
---

# DevTools for Oxc

DevTools for Oxc (`@vitejs/devtools-oxc`) is a built-in integration that inspects the [Oxc](https://oxc.rs/) toolchain — oxlint and oxfmt. It was donated from [`yuyinws/oxc-inspector`](https://github.com/yuyinws/oxc-inspector) by Leo.

## What it does

- **Visualize lint output** — explore oxlint results in an interactive interface.
- **Config helper** — read oxlint and oxfmt configuration at a glance.

## Getting started

DevTools for Oxc ships with Vite DevTools. When its package is present it mounts via `DevToolsOxc()`; otherwise open the **Oxc** launcher in the dock to install it on demand, then restart the dev server.

```ts [vite.config.ts]
import { DevTools } from '@vitejs/devtools'
import { DevToolsOxc } from '@vitejs/devtools-oxc/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [DevTools(), DevToolsOxc()],
})
```

It also runs standalone from the CLI with `npx @vitejs/devtools-oxc`.
