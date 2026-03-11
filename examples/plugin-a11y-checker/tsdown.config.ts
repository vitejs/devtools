import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: {
      index: 'src/node/index.ts',
    },
    clean: true,
    dts: true,
    format: 'esm',
    platform: 'node',
    exports: true,
  },
  {
    entry: {
      'client/run-axe': 'src/client/run-axe.ts',
    },
    format: 'esm',
    platform: 'browser',
    external: ['axe-core', '@vitejs/devtools-kit', '@vitejs/devtools-kit/client'],
  },
])
