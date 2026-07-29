import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import Button from './Button.vue'

const variants = ['primary', 'soft', 'secondary', 'ghost', 'danger'] as const
const sizes = ['sm', 'md', 'lg'] as const

function row(children: any, label?: string) {
  return h('div', { class: 'flex items-center gap-3 flex-wrap' }, [
    label ? h('div', { class: 'w-20 text-xs op-mute font-mono' }, label) : null,
    children,
  ])
}

const meta = {
  title: 'Display/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'The unified DevTools button, shared by the confirm modal, the auth OTP form, the launcher view and json-render. Variants (`primary`, `soft`, `secondary`, `ghost`, `danger`), sizes (`sm`/`md`/`lg`), plus `block`, `loading`, `disabled` and an optional leading `#icon` slot.',
      },
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

/** Every variant at the default size. */
export const Variants: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'flex flex-col gap-3 p8 bg-base color-base font-sans' }, variants.map(variant => row(
      h(Button, { variant }, { default: () => variant[0]!.toUpperCase() + variant.slice(1) }),
      variant,
    ))),
  }),
}

/** The three sizes (shown with the primary variant). */
export const Sizes: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'flex items-center gap-3 p8 bg-base color-base font-sans' }, sizes.map(size => h(Button, { variant: 'primary', size }, { default: () => size }))),
  }),
}

/** With a leading icon (via the `#icon` slot). */
export const WithIcon: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'flex items-center gap-3 p8 bg-base color-base font-sans' }, [
      h(Button, { variant: 'primary' }, {
        icon: () => h('div', { class: 'i-ph-shield-check-duotone w-4.5 h-4.5' }),
        default: () => 'Authorize',
      }),
      h(Button, { variant: 'danger' }, {
        icon: () => h('div', { class: 'i-ph-trash-duotone w-4.5 h-4.5' }),
        default: () => 'Delete',
      }),
    ]),
  }),
}

/** Loading (spinner + disabled) and disabled states. */
export const States: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'flex items-center gap-3 p8 bg-base color-base font-sans' }, [
      h(Button, { variant: 'primary', loading: true }, { default: () => 'Authorizing' }),
      h(Button, { variant: 'primary', disabled: true }, { default: () => 'Disabled' }),
    ]),
  }),
}

/** Full-width block button, as used in the auth form. */
export const Block: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'max-w-80 p8 bg-base color-base font-sans' }, h(Button, { variant: 'primary', size: 'lg', block: true }, { default: () => 'Authorize' })),
  }),
}
