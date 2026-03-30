import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'app/scripts/*.ts',
  ],
  tsconfig: './tsconfig.json',
  target: 'esnext',
  deps: {
    alwaysBundle: [
      /^@vitejs\/devtools-kit(?:\/.*)?$/,
    ],
  },
  platform: 'browser',
  clean: true,
})
