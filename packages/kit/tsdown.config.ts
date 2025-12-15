import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'utils/events': 'src/utils/events.ts',
    'utils/nanoid': 'src/utils/nanoid.ts',
    'client': 'src/client/index.ts',
  },
  exports: true,
  clean: true,
  tsconfig: '../../tsconfig.base.json',
  dts: true,
})
