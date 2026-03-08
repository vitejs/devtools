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
            50: '#fcf4ff',
            100: '#f7e5ff',
            200: '#f0d0ff',
            300: '#e5acff',
            400: '#d577ff',
            DEFAULT: '#d577ff',
            500: '#c543ff',
            600: '#bd34fe',
            700: '#9f0fe1',
            800: '#8512b7',
            900: '#6d1093',
            950: '#4d006e',
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
