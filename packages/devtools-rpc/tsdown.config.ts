import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: [
      'src/index.ts',
    ],
    tsconfig: '../../tsconfig.pkgs.json',
    clean: true,
    fixedExtension: true,
    dts: true,
  },
  {
    entry: ['src/presets/ws/client.ts', 'src/presets/ws/server.ts', 'src/presets/index.ts'],
    tsconfig: '../../tsconfig.pkgs.json',
    clean: true,
    fixedExtension: true,
    outDir: 'dist/presets',
    dts: true,
  },
])
