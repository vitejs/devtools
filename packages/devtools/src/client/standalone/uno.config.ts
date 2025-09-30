import { fileURLToPath } from 'node:url'
import { defineConfig } from 'unocss'
import config from '../webcomponents/uno.config'

export default defineConfig({
  ...config,
  content: {
    filesystem: [
      fileURLToPath(new URL('../src/client/webcomponents/components/**/*.vue', import.meta.url)),
    ],
  },
})
