import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'client': 'src/client.ts',
    'server': 'src/server.ts',
    'presets/ws/client': 'src/presets/ws/client.ts',
    'presets/ws/server': 'src/presets/ws/server.ts',
    'presets/index': 'src/presets/index.ts',
  },
  tsconfig: '../../tsconfig.base.json',
  clean: true,
  dts: true,
  exports: true,
  inlineOnly: false,
})
