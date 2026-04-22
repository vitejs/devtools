import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'rpc/index': 'src/rpc/index.ts',
    'rpc/client': 'src/rpc/client.ts',
    'rpc/server': 'src/rpc/server.ts',
    'rpc/presets/index': 'src/rpc/presets/index.ts',
    'rpc/presets/ws/client': 'src/rpc/presets/ws/client.ts',
    'rpc/presets/ws/server': 'src/rpc/presets/ws/server.ts',
  },
  tsconfig: '../../tsconfig.base.json',
  clean: true,
  dts: true,
  exports: true,
})
