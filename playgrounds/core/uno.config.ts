import { presetDevToolsUI } from '@vitejs/devtools-ui/unocss'
import { defineConfig } from 'unocss'

export default defineConfig({
  presets: [
    presetDevToolsUI(),
  ],
})
