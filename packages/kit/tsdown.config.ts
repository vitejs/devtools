import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'utils/events': 'src/utils/events.ts',
    'utils/nanoid': 'src/utils/nanoid.ts',
    'utils/shared-state': 'src/utils/shared-state.ts',
    'utils/logger': 'src/utils/logger.ts',
    'client': 'src/client/index.ts',
  },
  exports: true,
  clean: true,
  tsconfig: '../../tsconfig.base.json',
  dts: true,
})
