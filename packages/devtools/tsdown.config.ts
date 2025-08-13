import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/cli.ts',
    'src/dirs.ts',
  ],
  clean: true,
  tsconfig: '../../tsconfig.pkgs.json',
  fixedExtension: true,
  dts: true,
})
