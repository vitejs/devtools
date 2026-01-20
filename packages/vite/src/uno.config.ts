import { fileURLToPath } from 'node:url'
import { createLocalFontProcessor } from '@unocss/preset-web-fonts/local'
import { presetDevToolsUI } from '@vitejs/devtools-ui/unocss'
import { defineConfig } from 'unocss'

export default defineConfig({
  presets: [

    presetDevToolsUI({
      webFonts: {
        processors: createLocalFontProcessor({
          fontAssetsDir: fileURLToPath(new URL('./app/public/fonts', import.meta.url)),
          fontServeBaseUrl: './fonts',
        }),
      },
    }),
  ],
})
