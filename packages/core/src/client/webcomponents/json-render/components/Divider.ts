import { defineComponent, h } from 'vue'
import { borderSolid } from './tokens'
import { registryProps } from './types'

export interface DividerProps {
  label?: string
}

export const Divider = defineComponent({
  name: 'JrDivider',
  props: registryProps<'Divider', DividerProps>(),
  setup(ctx) {
    return () => {
      const { label } = ctx.element.props
      const rule = { flex: 1, border: 'none', borderTop: borderSolid() }
      if (label) {
        return h('div', {
          class: 'jr-divider',
          style: { display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' },
        }, [
          h('hr', { style: rule }),
          h('span', { style: { fontSize: '11px', opacity: 0.5 } }, label),
          h('hr', { style: rule }),
        ])
      }
      return h('hr', {
        class: 'jr-divider',
        style: { border: 'none', borderTop: borderSolid(), margin: '4px 0' },
      })
    }
  },
})
