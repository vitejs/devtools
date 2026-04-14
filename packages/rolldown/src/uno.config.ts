import { fileURLToPath } from 'node:url'
import { createLocalFontProcessor } from '@unocss/preset-web-fonts/local'
import { presetDevToolsUI } from '@vitejs/devtools-ui/unocss'
import { defineConfig } from 'unocss'

export default defineConfig({
  presets: [
    presetDevToolsUI({
      theme: {
        colors: {
          primary: {
            50: '#fff5f1',
            100: '#ffe8e0',
            200: '#ffd1bf',
            300: '#ffb08f',
            400: '#ff8454',
            DEFAULT: '#ff4100',
            500: '#ff5f26',
            600: '#ff4100',
            700: '#db3300',
            800: '#b82a00',
            900: '#942300',
            950: '#5f1400',
          },
        },
      },
      webFonts: {
        processors: createLocalFontProcessor({
          fontAssetsDir: fileURLToPath(new URL('./app/public/fonts', import.meta.url)),
          fontServeBaseUrl: './fonts',
        }),
      },
    }),
  ],
})
