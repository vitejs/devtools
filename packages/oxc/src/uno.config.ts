import type { Theme } from '@unocss/preset-wind4'
import { fileURLToPath } from 'node:url'
import { createLocalFontProcessor } from '@unocss/preset-web-fonts/local'
import { presetDevToolsUI } from '@vitejs/devtools-ui/unocss'
import { defineConfig } from 'unocss'

// Oxc's brand accent is the cyan mark baked into `BannerOxcDevTools` (#00F7F1).
// Derive a full primary scale from it so buttons, links, badges and the
// checkbox tint match the wordmark instead of the shared indigo default.
// `presetDevToolsUI` deep-merges this over the Wind4 default theme.
const oxcTheme: Theme = {
  colors: {
    primary: {
      50: '#ecfeff',
      100: '#cffafe',
      200: '#a5f3fc',
      300: '#67f5f2',
      400: '#22e6e1',
      DEFAULT: '#00c9c4',
      500: '#00c9c4',
      600: '#0499a0',
      700: '#0a7981',
      800: '#115e69',
      900: '#134e59',
      950: '#053239',
    },
  },
}

export default defineConfig({
  presets: [
    presetDevToolsUI({
      theme: oxcTheme,
      webFonts: {
        processors: createLocalFontProcessor({
          fontAssetsDir: fileURLToPath(new URL('./public/fonts', import.meta.url)),
          fontServeBaseUrl: '../fonts',
        }),
      },
    }),
  ],
})
