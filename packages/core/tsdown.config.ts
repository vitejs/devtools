import { defineConfig } from 'tsdown'

const define = {
  'import.meta.env.VITE_DEVTOOLS_LOCAL_DEV': 'false',
  'process.env.VITE_DEVTOOLS_LOCAL_DEV': 'false',
}

const deps = {
  neverBundle: [
    'vite',
    /^node:/,
  ],
}

const inputOptions = {
  resolve: {
    mainFields: ['module', 'main'],
  },
  experimental: {
    resolveNewUrlToAsset: false,
  },
}

const tsconfig = '../../tsconfig.base.json'

// The client is now the prebuilt `@devframes/hub-ui` package served through
// the hub's `ui` slot, so core ships only its neutral node surface.
export default defineConfig({
  clean: true,
  platform: 'neutral',
  tsconfig,
  deps,
  entry: {
    'index': 'src/index.ts',
    'integration': 'src/integration.ts',
    'internal': 'src/internal.ts',
    'dirs': 'src/dirs.ts',
    'cli': 'src/node/cli.ts',
    'cli-commands': 'src/node/cli-commands.ts',
    'config': 'src/node/config.ts',
  },
  exports: true,
  dts: true,
  inputOptions,
  define,
})
