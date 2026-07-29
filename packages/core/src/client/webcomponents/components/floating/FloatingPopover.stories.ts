import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { defineComponent, h, onMounted, ref, shallowRef } from 'vue'
import FloatingPopover from './FloatingPopover'

// @unocss-include

/**
 * A story harness: render an anchor element, then feed its DOM node to the
 * popover on mount (the real component positions against a live element).
 */
function harness(content: string | (() => any), anchorLabel = 'Anchor') {
  return defineComponent({
    setup() {
      const anchor = ref<HTMLElement | null>(null)
      const item = shallowRef<any>(null)
      onMounted(() => {
        if (anchor.value)
          item.value = { el: anchor.value, content }
      })
      return () => h('div', { class: 'flex items-center justify-center p20 min-h-80 font-sans' }, [
        h('button', {
          ref: (el: any) => (anchor.value = el),
          class: 'px3 py1.5 rounded border border-base bg-glass color-base shadow',
        }, anchorLabel),
        h(FloatingPopover, { item: item.value, dismissOnClickOutside: false }),
      ])
    },
  })
}

const meta = {
  title: 'Dock/Floating/Popover',
  component: FloatingPopover,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'The floating primitive behind tooltips, group popovers, the overflow panel and the edge-position dropdown. It anchors to a DOM element and auto-aligns based on the anchor\'s position in the viewport.',
      },
    },
  },
} satisfies Meta<typeof FloatingPopover>

export default meta
type Story = StoryObj<typeof meta>

/** String content — the tooltip form. */
export const TextTooltip: Story = {
  render: () => harness('Open the inspector'),
}

/** VNode content — a small menu, as the group/overflow popovers render. */
export const MenuContent: Story = {
  render: () => harness(() => h('div', { class: 'flex flex-col gap-0.5 min-w-40' }, [
    h('div', { class: 'px2 pt1 pb1.5 op60 text-2.75 uppercase tracking-wide font-medium' }, 'Menu'),
    ...['Overview', 'Pages', 'Components'].map(label =>
      h('button', { class: 'px2 py1.5 rounded text-sm text-left op80 hover:op100 hover:bg-active transition' }, label)),
  ]), 'Reveal menu'),
}

export const CornerAnchors: Story = {
  render: () => defineComponent({
    setup() {
      const corners = [
        { label: 'Top left', class: 'left-2 top-2' },
        { label: 'Top right', class: 'right-2 top-2' },
        { label: 'Bottom left', class: 'left-2 bottom-2' },
        { label: 'Bottom right', class: 'right-2 bottom-2' },
      ].map(corner => ({
        ...corner,
        el: null as HTMLElement | null,
        item: shallowRef<any>(null),
      }))
      const menu = () => h('div', { class: 'flex flex-col gap-0.5 min-w-40' }, [
        h('div', { class: 'px2 pt1 pb1.5 op60 text-2.75 uppercase tracking-wide font-medium' }, 'Menu'),
        ...['Overview', 'Pages', 'Components'].map(label =>
          h('button', { class: 'px2 py1.5 rounded text-sm text-left op80 hover:op100 hover:bg-active transition' }, label)),
      ])
      onMounted(() => {
        for (const corner of corners) {
          if (corner.el)
            corner.item.value = { el: corner.el, content: menu }
        }
      })
      return () => h('div', { class: 'min-h-100 font-sans' }, corners.flatMap(corner => [
        h('button', {
          key: corner.label,
          ref: (el: any) => (corner.el = el),
          class: `fixed ${corner.class} px3 py1.5 rounded border border-base bg-glass color-base shadow`,
        }, corner.label),
        h(FloatingPopover, { item: corner.item.value, dismissOnClickOutside: false }),
      ]))
    },
  }),
}
