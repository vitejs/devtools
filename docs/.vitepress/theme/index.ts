import type { Theme } from 'vitepress'
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'
import DefaultTheme from 'vitepress/theme'
import 'virtual:group-icons.css'
import './styles.css'
import '@shikijs/vitepress-twoslash/style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(TwoslashFloatingVue)
  },
} satisfies Theme
