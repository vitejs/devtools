import { defineComponent, h } from 'vue'
import { borderSolid, variantSurface } from './tokens'
import { registryProps } from './types'

export interface StackProps {
  direction?: 'row' | 'column'
  gap?: number
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'
  padding?: number
  wrap?: boolean
  flex?: number | string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'info' | 'success' | 'warning'
  interactive?: boolean
}

// Map the base catalog's `align` / `justify` enums onto CSS flexbox values.
const alignMap: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' }
const justifyMap: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between', around: 'space-around' }

export const Stack = defineComponent({
  name: 'JrStack',
  props: registryProps<'Stack', StackProps>(),
  setup(ctx, { slots }) {
    return () => {
      const { direction = 'column', gap = 8, align, justify, padding, wrap, flex, variant = 'primary', interactive = false } = ctx.element.props
      const isHorizontal = direction === 'row'
      const surface = variantSurface(variant)
      const restingBackground = surface.background
      return h('div', {
        class: 'jr-stack',
        style: {
          display: 'flex',
          flexDirection: isHorizontal ? 'row' : 'column',
          gap: `${gap}px`,
          alignItems: align ? (alignMap[align] ?? align) : (isHorizontal ? 'center' : 'stretch'),
          justifyContent: justify ? (justifyMap[justify] ?? justify) : undefined,
          flexWrap: wrap ? 'wrap' : undefined,
          // `interactive` rows get a small default padding/radius so the
          // hover tint reads as a deliberate affordance instead of hugging
          // the content edge-to-edge; an explicit `padding` prop still wins.
          padding: padding ? `${padding}px` : (interactive ? '4px 6px' : undefined),
          // Matches Card's own borderRadius so a row's hover tint reads
          // consistently with the card surfaces it sits inside.
          borderRadius: interactive ? '6px' : undefined,
          // Only the four semantic variants draw a border; primary/secondary/ghost stay borderless.
          border: surface.border ? borderSolid(surface.border) : undefined,
          transition: interactive ? 'background-color 0.15s ease, border-color 0.15s ease' : undefined,
          flex: flex != null ? String(flex) : undefined,
          backgroundColor: restingBackground,
        },
        // `interactive` only ever tints on hover — Stack has no click/press
        // semantics of its own, so rows built from it stay non-clickable.
        onMouseenter: interactive ? (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.backgroundColor = surface.hoverBackground ?? '' } : undefined,
        onMouseleave: interactive ? (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.backgroundColor = restingBackground ?? '' } : undefined,
      }, slots.default?.())
    }
  },
})
