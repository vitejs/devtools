# Getting Started

> [!WARNING]
> Vite DevTools is still in development and not yet ready for production use.
> And currently Vite DevTools is designed only for Vite-Rolldown's build mode.
> Dev mode and normal Vite are not supported yet.

If you want to give an early preview, you can try it out by building this project from source, or install the preview build with the following steps:

Switch your Vite to [Rolldown Vite](https://vite.dev/guide/rolldown#how-to-try-rolldown):

<!-- eslint-skip -->
```json [package.json]
{
  "dependencies": {
    "vite": "^7.0.0" // [!code --]
    "vite": "npm:rolldown-vite@latest" // [!code ++]
  }
}
```

Install the DevTools plugin:

```bash
pnpm add -D @vitejs/devtools
```

Enable the DevTools plugin in your Vite config and turn on the debug mode for Rolldown:

```ts [vite.config.ts] twoslash
import { DevTools } from '@vitejs/devtools'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    DevTools(),
  ],
  build: {
    rolldownOptions: {
      debug: {}, // enable debug mode
    },
  }
})
```

Run your Vite build, to generate the Rolldown build metadata:

```bash
pnpm build
```

Open the DevTools panel in your browser to play with the DevTools:

```bash
pnpm dev
```
