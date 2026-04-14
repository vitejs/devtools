import type { RegistryComponentProps } from './types'
import { defineComponent, h } from 'vue'
import { bg, border, borderMuted, borderSolid, hoverOverlay } from './tokens'

export const DataTable = defineComponent({
  name: 'JrDataTable',
  props: ['element', 'emit', 'on', 'bindings', 'loading'],
  setup(ctx: RegistryComponentProps) {
    return () => {
      const { columns = [], rows = [], maxHeight } = ctx.element.props
      const rowClick = ctx.on('rowClick')

      return h('div', {
        class: 'jr-data-table',
        style: {
          overflow: 'auto',
          maxHeight,
          border: borderSolid(border),
          borderRadius: '4px',
        },
      }, [
        h('table', {
          style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
        }, [
          h('thead', [
            h('tr', {
              style: { borderBottom: borderSolid(border) },
            }, columns.map((col: any) =>
              h('th', {
                style: {
                  padding: '8px',
                  textAlign: 'left',
                  fontWeight: '600',
                  fontSize: '11px',
                  opacity: '0.7',
                  whiteSpace: 'nowrap',
                  width: col.width,
                  position: 'sticky',
                  top: 0,
                  backgroundColor: bg,
                },
              }, col.label),
            )),
          ]),
          h('tbody', rows.map((row: any, index: number) =>
            h('tr', {
              key: index,
              style: {
                borderBottom: borderSolid(borderMuted),
                cursor: rowClick.bound ? 'pointer' : undefined,
              },
              onClick: rowClick.bound ? () => rowClick.emit() : undefined,
              onMouseenter: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.backgroundColor = hoverOverlay },
              onMouseleave: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.backgroundColor = '' },
            }, columns.map((col: any) =>
              h('td', {
                style: { padding: '6px 8px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' },
              }, String(row[col.key] ?? '')),
            )),
          )),
        ]),
      ])
    }
  },
})
