import { defineComponent, h, ref } from 'vue'
import { border, borderSolid, variantSurface } from './tokens'
import { registryProps } from './types'

export interface CardProps {
  title?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'info' | 'success' | 'warning'
  interactive?: boolean
}

export const Card = defineComponent({
  name: 'JrCard',
  props: registryProps<'Card', CardProps>(),
  setup(ctx, { slots }) {
    const collapsed = ref(!!ctx.element.props.defaultCollapsed)
    return () => {
      const { title, collapsible, variant = 'primary', interactive = false } = ctx.element.props
      const toggle = ctx.on('toggle')
      const setCollapsed = (next: boolean) => {
        collapsed.value = next
        toggle.emit()
      }
      const surface = variantSurface(variant)
      const borderColor = surface.border ?? border
      return h('div', {
        class: 'jr-card',
        style: {
          border: borderSolid(borderColor),
          borderRadius: '6px',
          overflow: 'hidden',
          backgroundColor: surface.background,
          transition: interactive ? 'border-color 0.15s ease' : undefined,
        },
        // `interactive` strengthens the border on hover rather than tinting
        // the background (already set by `variant`) — same transition timing
        // as Stack's row hover, just on `border-color` instead of `background`.
        onMouseenter: interactive ? (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.borderColor = surface.hoverBorder ?? borderColor } : undefined,
        onMouseleave: interactive ? (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.borderColor = borderColor } : undefined,
      }, [
        // Renders without a `title` too — a collapsible card needs this as its click target.
        (title || collapsible) && h('div', {
          class: 'jr-card-header',
          style: {
            padding: '8px 12px',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: collapsible ? 'pointer' : undefined,
            borderBottom: collapsed.value ? 'none' : borderSolid(borderColor),
            backgroundColor: surface.headerBackground,
            userSelect: 'none',
          },
          onClick: collapsible ? () => setCollapsed(!collapsed.value) : undefined,
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
