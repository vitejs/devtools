import type { RegistryComponentProps } from './types'
import { defineComponent, h } from 'vue'

export const Stack = defineComponent({
  name: 'JrStack',
  props: ['element', 'emit', 'on', 'bindings', 'loading'],
  setup(ctx: RegistryComponentProps, { slots }) {
    return () => {
      const { direction = 'vertical', gap = 8, align, justify, padding, flex } = ctx.element.props
      const isHorizontal = direction === 'horizontal'
      return h('div', {
        class: 'jr-stack',
        style: {
          display: 'flex',
          flexDirection: isHorizontal ? 'row' : 'column',
          gap: `${gap}px`,
          alignItems: align || (isHorizontal ? 'center' : 'stretch'),
          justifyContent: justify,
          padding: padding ? `${padding}px` : undefined,
          flex: flex != null ? String(flex) : undefined,
        },
      }, slots.default?.())
    }
  },
})
