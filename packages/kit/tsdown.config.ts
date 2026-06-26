import { defineConfig } from 'tsdown'

const common = {
  exports: true,
  tsconfig: '../../tsconfig.base.json',
  dts: true,
}

export default defineConfig([
  {
    ...common,
    entry: {
      'index': 'src/index.ts',
      'constants': 'src/constants.ts',
      'utils/events': 'src/utils/events.ts',
      'utils/nanoid': 'src/utils/nanoid.ts',
      'utils/human-id': 'src/utils/human-id.ts',
      'utils/when': 'src/utils/when.ts',
      'utils/shared-state': 'src/utils/shared-state.ts',
      'client': 'src/client/index.ts',
    },
    clean: true,
    platform: 'neutral',
  },
  {
    ...common,
    entry: {
      'node/index': 'src/node/index.ts',
    },
    clean: false,
    fixedExtension: false,
    platform: 'node',
  },
])
