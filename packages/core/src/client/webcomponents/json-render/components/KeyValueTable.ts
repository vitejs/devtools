import { defineComponent, h } from 'vue'
import { borderSolid, borderSubtle } from './tokens'
import { registryProps } from './types'

export interface KeyValueTableProps {
  data?: Record<string, unknown>
}

export const KeyValueTable = defineComponent({
  name: 'JrKeyValueTable',
  props: registryProps<'KeyValueTable', KeyValueTableProps>(),
  setup(ctx) {
    return () => {
      const { data = {} } = ctx.element.props
      const entries = Object.entries(data)
      return h('div', { class: 'jr-kv-table' }, [
        h('table', {
          style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
        }, entries.map(([key, value]) =>
          h('tr', {
            style: { borderBottom: borderSolid(borderSubtle) },
          }, [
            h('td', {
              style: { padding: '6px 8px', opacity: '0.7', whiteSpace: 'nowrap', verticalAlign: 'top' },
            }, key),
            h('td', {
              style: { padding: '6px 8px', fontFamily: 'monospace', wordBreak: 'break-all' },
            }, typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '')),
          ]),
        )),
      ])
    }
  },
})
