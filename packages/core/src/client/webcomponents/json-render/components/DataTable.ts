import { defineComponent, h } from 'vue'
import { bg, border, borderMuted, borderSolid, hoverOverlay } from './tokens'
import { registryProps } from './types'

export interface DataTableColumn {
  key: string
  label?: string
  width?: string
}

export interface DataTableProps {
  columns?: (string | DataTableColumn)[]
  rows?: Record<string, unknown>[]
  height?: number
}

export const DataTable = defineComponent({
  name: 'JrDataTable',
  props: registryProps<'DataTable', DataTableProps>(),
  setup(ctx) {
    return () => {
      const { columns: rawColumns = [], rows = [], height } = ctx.element.props
      const rowClick = ctx.on('rowClick')

      // Base catalog columns are `string | { key, label? }`; normalize to objects.
      const columns = rawColumns.map(col => (typeof col === 'string' ? { key: col } : col))

      return h('div', {
        class: 'jr-data-table',
        style: {
          overflow: 'auto',
          scrollbarGutter: 'stable',
          maxHeight: height != null ? `${height}px` : undefined,
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
            }, columns.map(col =>
              h('th', {
                style: {
                  padding: '8px',
                  textAlign: 'left',
                  fontWeight: '600',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  width: col.width,
                  position: 'sticky',
                  top: 0,
                  backgroundColor: `color-mix(in oklab,${bg} 75%,transparent)`,
                  backdropFilter: 'blur(8px)',
                },
              }, col.label ?? col.key),
            )),
          ]),
          h('tbody', rows.map((row, index) =>
            h('tr', {
              key: index,
              style: {
                borderBottom: borderSolid(borderMuted),
                cursor: rowClick.bound ? 'pointer' : undefined,
              },
              onClick: rowClick.bound ? () => rowClick.emit() : undefined,
              onMouseenter: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.backgroundColor = hoverOverlay },
              onMouseleave: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.backgroundColor = '' },
            }, columns.map(col =>
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
