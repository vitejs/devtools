# @vitejs/devtools-agent

Inspect Vite development servers and recorded Rolldown builds from agents through Vite DevTools and `devframe connect`.

Install alongside `@vitejs/devtools`; the host discovers and mounts the plugin automatically:

```sh
pnpm add -D @vitejs/devtools @vitejs/devtools-agent
```

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  devtools: { apply: 'serve' },
})
```

To inspect the Vite dev server, also install `@vitejs/devtools-vite`. To analyze a Rolldown build, first enable build recording and run a build.

See the [Agents guide](https://devtools.vite.dev/guide/agents) for connector setup, project selection and build inspection.
