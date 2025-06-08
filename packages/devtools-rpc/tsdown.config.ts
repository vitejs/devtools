import { defineConfig } from 'tsdown'

export default defineConfig([{
  entry: [
    'src/index.ts',
  ],
  clean: true,
  fixedExtension: true,
}, {
  entry: ['src/presets/ws/client.ts', 'src/presets/ws/server.ts', 'src/presets/index.ts'],
  clean: true,
  fixedExtension: true,
  outDir: 'dist/presets',
}])
