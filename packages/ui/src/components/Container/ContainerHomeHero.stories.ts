import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import BannerViteDevTools from '../Banner/BannerViteDevTools.vue'
import ContainerHomeHero from './ContainerHomeHero.vue'

const meta = {
  title: 'Container/ContainerHomeHero',
  component: ContainerHomeHero,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'Shared home-page header spacing for a DevTools wordmark and related brand metadata.' } },
  },
} satisfies Meta<typeof ContainerHomeHero>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    setup: () => () => h(ContainerHomeHero, null, {
      default: () => h(BannerViteDevTools),
    }),
  }),
}

export const WithSecondaryContent: Story = {
  render: () => ({
    setup: () => () => h(ContainerHomeHero, null, {
      default: () => [
        h(BannerViteDevTools),
        h('span', { class: 'text-sm op50' }, 'Secondary brand metadata'),
      ],
    }),
  }),
}
