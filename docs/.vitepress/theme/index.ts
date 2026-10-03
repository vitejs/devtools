/// <reference types="vite/client" />

import type { Theme } from 'vitepress'
import monoIcon from '@assets/icons/vite-mono.svg'
import footerBg from '@assets/vite/footer-background.jpg'
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'
import BaseTheme, { themeContextKey } from '@voidzero-dev/vitepress-theme'
import 'virtual:group-icons.css'
import './styles.css'
import '@shikijs/vitepress-twoslash/style.css'

export default {
  extends: BaseTheme,
  enhanceApp({ app }) {
    app.use(TwoslashFloatingVue)

    app.provide(themeContextKey, {
      logoDark: '/logo-dark.svg',
      logoLight: '/logo-light.svg',
      logoAlt: 'Vite Devtools',
      footerBg,
      monoIcon,
    })
  },
} satisfies Theme
