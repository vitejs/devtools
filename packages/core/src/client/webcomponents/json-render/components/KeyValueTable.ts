import type { RegistryComponentProps } from './types'
import { defineComponent, h } from 'vue'
import { borderSolid, borderSubtle } from './tokens'

export const KeyValueTable = defineComponent({
  name: 'JrKeyValueTable',
  props: ['element', 'emit', 'on', 'bindings', 'loading'],
  setup(ctx: RegistryComponentProps) {
    return () => {
      const { title, entries = [] } = ctx.element.props
      return h('div', { class: 'jr-kv-table' }, [
        title && h('div', {
          style: { fontSize: '13px', fontWeight: '600', marginBottom: '8px' },
        }, title),
        h('table', {
          style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
        }, entries.map((entry: any) =>
          h('tr', {
            style: { borderBottom: borderSolid(borderSubtle) },
          }, [
            h('td', {
              style: { padding: '6px 8px', opacity: '0.7', whiteSpace: 'nowrap', verticalAlign: 'top' },
            }, entry.key),
            h('td', {
              style: { padding: '6px 8px', fontFamily: 'monospace', wordBreak: 'break-all' },
            }, entry.value),
          ]),
        )),
      ])
    }
  },
})
