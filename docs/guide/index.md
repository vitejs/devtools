# Getting Started

## Overview

Vite Devtools is...

## Try Vite Devtools Online

You can try Vite Devtools online on [StackBlitz](https://vite.new).

## Installation

::: code-group

```bash [npm]
npm install -D @vitejs/devtools
```

```bash [yarn]
yarn add -D @vitejs/devtools
```

```bash [pnpm]
pnpm add -D @vitejs/devtools
```

```bash [bun]
bun add -D @vitejs/devtools
```

:::

## Configuration

```ts [vite.config.ts] twoslash
import { DevTools } from '@vitejs/devtools'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    DevTools(),
  ],
})
```
