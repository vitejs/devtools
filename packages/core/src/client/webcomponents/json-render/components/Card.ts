import type { RegistryComponentProps } from './types'
import { defineComponent, h, ref } from 'vue'
import { border, borderSolid, borderStrong, colors, surfaceMuted } from './tokens'

// Mirrors `ContainerCard.vue`'s (packages/ui) opt-in `variant` model: `primary`
// (default) keeps today's fully transparent look, so existing specs render
// unchanged; `ghost` is the same no-fill look under a more intentional name.
const variantBackground: Record<string, string | undefined> = {
  primary: undefined,
  secondary: surfaceMuted,
  ghost: undefined,
  danger: colors.danger.bg,
}

export const Card = defineComponent({
  name: 'JrCard',
  props: ['element', 'emit', 'on', 'bindings', 'loading'],
  setup(ctx: RegistryComponentProps, { slots }) {
    const collapsed = ref(false)
    return () => {
      const { title, collapsible, variant = 'primary', interactive = false } = ctx.element.props
      return h('div', {
        class: 'jr-card',
        style: {
          border: borderSolid(border),
          borderRadius: '6px',
          overflow: 'hidden',
          backgroundColor: variantBackground[variant],
          transition: interactive ? 'border-color 0.15s ease' : undefined,
        },
        // `interactive` strengthens the border on hover rather than tinting
        // the background (already set by `variant`) — same transition timing
        // as Stack's row hover, just on `border-color` instead of `background`.
        onMouseenter: interactive ? (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.borderColor = borderStrong } : undefined,
        onMouseleave: interactive ? (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.borderColor = border } : undefined,
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
