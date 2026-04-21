import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'client': 'src/client.ts',
    'server': 'src/server.ts',
    'presets/ws/client': 'src/presets/ws/client.ts',
    'presets/ws/server': 'src/presets/ws/server.ts',
    'presets/index': 'src/presets/index.ts',
    'peer/index': 'src/peer/index.ts',
    'peer/adapters/ws-client': 'src/peer/adapters/ws-client.ts',
    'peer/adapters/ws-server': 'src/peer/adapters/ws-server.ts',
  },
  tsconfig: '../../tsconfig.base.json',
  clean: true,
  dts: true,
  exports: true,
})
