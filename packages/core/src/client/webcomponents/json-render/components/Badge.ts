import { defineComponent, h } from 'vue'
import { colors } from './tokens'
import { registryProps } from './types'

export interface BadgeProps {
  text?: string
  variant?: 'default' | 'info' | 'success' | 'warning' | 'danger'
  title?: string
  minWidth?: number
}

export const Badge = defineComponent({
  name: 'JrBadge',
  props: registryProps<'Badge', BadgeProps>(),
  setup(ctx) {
    return () => {
      const { text, variant = 'default', title, minWidth } = ctx.element.props
      const c = colors[variant] || colors.default
      // Base catalog `minWidth` is a number of pixels.
      const minWidthCss = minWidth == null ? undefined : (typeof minWidth === 'number' ? `${minWidth}px` : minWidth)
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
          minWidth: minWidthCss,
        },
      }, text)
    }
  },
})
