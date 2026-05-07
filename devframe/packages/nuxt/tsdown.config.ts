import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'runtime/plugin.client': 'src/runtime/plugin.client.ts',
  },
  tsconfig: '../../../tsconfig.base.json',
  clean: true,
  dts: true,
  exports: true,
  // Keep transitive Nuxt/Vite type graphs out of dts bundling. Consumers
  // resolve these via their own node_modules at install time.
  deps: {
    neverBundle: [
      '@nuxt/kit',
      '@nuxt/schema',
      '@vitejs/plugin-vue-jsx',
      '@vue/babel-plugin-jsx',
      '@vue/babel-plugin-resolve-type',
      'scule',
    ],
  },
})
