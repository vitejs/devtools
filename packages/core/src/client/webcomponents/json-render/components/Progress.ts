import { defineComponent, h } from 'vue'
import { primary, surfaceBadge } from './tokens'
import { registryProps } from './types'

export interface ProgressProps {
  value: number
  max?: number
  label?: string
}

export const Progress = defineComponent({
  name: 'JrProgress',
  props: registryProps<'Progress', ProgressProps>(),
  setup(ctx) {
    return () => {
      const { value, max = 100, label } = ctx.element.props
      const percent = Math.min(100, Math.max(0, (value / max) * 100))
      return h('div', { class: 'jr-progress' }, [
        label && h('div', {
          style: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' },
        }, [
          h('span', label),
          h('span', { style: { opacity: 0.6 } }, `${Math.round(percent)}%`),
        ]),
        h('div', {
          style: {
            height: '6px',
            backgroundColor: surfaceBadge,
            borderRadius: '3px',
            overflow: 'hidden',
          },
        }, [
          h('div', {
            style: {
              height: '100%',
              width: `${percent}%`,
              backgroundColor: primary,
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            },
          }),
        ]),
      ])
    }
  },
})
