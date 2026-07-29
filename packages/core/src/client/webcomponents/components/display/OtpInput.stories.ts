import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { defineComponent, h, ref } from 'vue'
import OtpInput from './OtpInput.vue'

/** A stateful harness so the controlled `v-model` reflects typing/paste. */
function harness(props: Record<string, unknown> = {}, initial = '') {
  return defineComponent({
    setup() {
      const code = ref(initial)
      return () => h('div', { class: 'p10 bg-base color-base font-sans flex flex-col items-center gap-4' }, [
        h(OtpInput, { 'modelValue': code.value, 'onUpdate:modelValue': (v: string) => (code.value = v), 'autofocus': false, ...props }),
        h('div', { class: 'text-sm op-fade font-mono' }, `value: "${code.value}"`),
      ])
    },
  })
}

const meta = {
  title: 'Display/OtpInput',
  component: OtpInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'An accessible one-time-code input: per-digit boxes with auto-advance, backspace-to-previous, arrow-key navigation, full-code paste, numeric-only entry (`inputmode="numeric"`, `autocomplete="one-time-code"`), per-digit `aria-label`s, and an error state that paints the boxes red and shakes.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

/** Empty — type digits, they auto-advance; paste a full code to fill at once. */
export const Default: Story = {
  render: () => ({ setup: () => () => h(harness()) }),
}

/** Partially filled. */
export const Filled: Story = {
  render: () => ({ setup: () => () => h(harness({}, '1234')) }),
}

/** Error state — red boxes and a shake (see the AuthNotice for the full flow). */
export const Invalid: Story = {
  render: () => ({ setup: () => () => h(harness({ invalid: true }, '0042')) }),
}

/** Disabled. */
export const Disabled: Story = {
  render: () => ({ setup: () => () => h(harness({ disabled: true }, '12')) }),
}

/** A shorter, four-digit variant. */
export const FourDigits: Story = {
  render: () => ({ setup: () => () => h(harness({ length: 4 })) }),
}
