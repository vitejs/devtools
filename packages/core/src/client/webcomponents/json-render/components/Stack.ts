import type { RegistryComponentProps } from './types'
import { defineComponent, h } from 'vue'

// Map the base catalog's `align` / `justify` enums onto CSS flexbox values.
const alignMap: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' }
const justifyMap: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between', around: 'space-around' }

export const Stack = defineComponent({
  name: 'JrStack',
  props: ['element', 'emit', 'on', 'bindings', 'loading'],
  setup(ctx: RegistryComponentProps, { slots }) {
    return () => {
      const { direction = 'column', gap = 8, align, justify, padding, wrap, flex } = ctx.element.props
      const isHorizontal = direction === 'row'
      return h('div', {
        class: 'jr-stack',
        style: {
          display: 'flex',
          flexDirection: isHorizontal ? 'row' : 'column',
          gap: `${gap}px`,
          alignItems: align ? (alignMap[align] ?? align) : (isHorizontal ? 'center' : 'stretch'),
          justifyContent: justify ? (justifyMap[justify] ?? justify) : undefined,
          flexWrap: wrap ? 'wrap' : undefined,
          padding: padding ? `${padding}px` : undefined,
          flex: flex != null ? String(flex) : undefined,
        },
      }, slots.default?.())
    }
  },
})
