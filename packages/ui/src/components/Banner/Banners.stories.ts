import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import BannerDevToolsKit from './BannerDevToolsKit.vue'
import BannerOxcDevTools from './BannerOxcDevTools.vue'
import BannerRolldownDevTools from './BannerRolldownDevTools.vue'
import BannerViteDevTools from './BannerViteDevTools.vue'
import BannerVitestUI from './BannerVitestUI.vue'

const meta = {
  title: 'Banner/DevTools',
  component: BannerRolldownDevTools,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'Colour-mode-aware wordmark banners for each DevTools surface. Wordmarks use `currentColor`; accent marks keep their brand colour in both themes.' } },
  },
} satisfies Meta<typeof BannerRolldownDevTools>

export default meta
type Story = StoryObj<typeof meta>

export const Gallery: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'flex flex-col gap-8 p8 items-start' }, [
      h(BannerViteDevTools),
      h(BannerRolldownDevTools),
      h(BannerOxcDevTools),
      h(BannerVitestUI),
      h(BannerDevToolsKit),
    ]),
  }),
}
