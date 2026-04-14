import type { RegistryComponentProps } from './types'
import { defineComponent, h, ref } from 'vue'
import { border, borderSolid } from './tokens'

export const Card = defineComponent({
  name: 'JrCard',
  props: ['element', 'emit', 'on', 'bindings', 'loading'],
  setup(ctx: RegistryComponentProps, { slots }) {
    const collapsed = ref(false)
    return () => {
      const { title, collapsible } = ctx.element.props
      return h('div', {
        class: 'jr-card',
        style: {
          border: borderSolid(border),
          borderRadius: '6px',
          overflow: 'hidden',
        },
      }, [
        title && h('div', {
          class: 'jr-card-header',
          style: {
            padding: '8px 12px',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: collapsible ? 'pointer' : undefined,
            borderBottom: collapsed.value ? 'none' : borderSolid(border),
            userSelect: 'none',
          },
          onClick: collapsible ? () => { collapsed.value = !collapsed.value } : undefined,
        }, [
          h('span', title),
          collapsible && h('span', {
            style: { fontSize: '10px', opacity: 0.5 },
          }, collapsed.value ? '▶' : '▼'),
        ]),
        !collapsed.value && h('div', {
          class: 'jr-card-content',
          style: { padding: '12px' },
        }, slots.default?.()),
      ])
    }
  },
})
