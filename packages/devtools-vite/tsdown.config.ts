import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/node/cli.ts', // Workaround for empty chunk
    'src/index.ts',
    'src/cli.ts',
    'src/dirs.ts',
  ],
  tsconfig: '../../tsconfig.pkgs.json',
  clean: false,
  target: 'esnext',
  fixedExtension: true,
  dts: true,
})
