import type { RegistryComponentProps } from './types'
import { defineComponent, h } from 'vue'
import { colors } from './tokens'

export const Badge = defineComponent({
  name: 'JrBadge',
  props: ['element', 'emit', 'on', 'bindings', 'loading'],
  setup(ctx: RegistryComponentProps) {
    return () => {
      const { text, variant = 'default', title, minWidth } = ctx.element.props
      const c = colors[variant as keyof typeof colors] || colors.default
      return h('span', {
        class: `jr-badge jr-badge-${variant}`,
        title,
        style: {
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '10px',
          fontSize: '11px',
          fontWeight: '500',
          textAlign: 'center' as const,
          backgroundColor: c.bg,
          color: c.fg,
          minWidth: minWidth || undefined,
        },
      }, text)
    }
  },
})
