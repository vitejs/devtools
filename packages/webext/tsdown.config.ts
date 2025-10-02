import { defineConfig } from 'tsdown'

export default defineConfig([{
  entry: [
    'src/*.ts',
    '!src/proxy.ts',
  ],
  clean: false,
  external: ['./app/devtools-app.js'],
  noExternal: [/^webext-bridge\/.*/],
}, {
  entry: ['src/proxy.ts'],
  clean: false,
  format: 'iife',
  outputOptions: {
    entryFileNames: '[name].js',
  },
  noExternal: [/^webext-bridge\/.*/],
}])
