import type { VNode } from 'vue'
import { useBoundProp } from '@json-render/vue'
import { defineComponent, h, ref } from 'vue'

/**
 * Props shape that json-render's Renderer passes to each registered component.
 * `element` contains the full element with resolved `.props`.
 * Children arrive via Vue slots, not as a prop.
 */
interface RegistryComponentProps {
  element: { type: string, props: Record<string, any> }
  emit: (event: string) => void
  on: (event: string) => { emit: () => void, shouldPreventDefault: boolean, bound: boolean }
  bindings?: Record<string, string>
  loading?: boolean
}

/**
 * DevTools component registry for json-render.
 * Maps component names to Vue components that the Renderer renders.
 */
export const devtoolsRegistry: Record<string, ReturnType<typeof defineComponent>> = {
  Stack: defineComponent({
    name: 'JrStack',
    props: ['element', 'emit', 'on', 'bindings', 'loading'],
    setup(ctx: RegistryComponentProps, { slots }) {
      return () => {
        const { direction = 'vertical', gap = 8, align, justify, padding } = ctx.element.props
        const isHorizontal = direction === 'horizontal'
        return h('div', {
          class: 'jr-stack',
          style: {
            display: 'flex',
            flexDirection: isHorizontal ? 'row' : 'column',
            gap: `${gap}px`,
            alignItems: align || (isHorizontal ? 'center' : 'stretch'),
            justifyContent: justify,
            padding: padding ? `${padding}px` : undefined,
          },
        }, slots.default?.())
      }
    },
  }),

  Card: defineComponent({
    name: 'JrCard',
    props: ['element', 'emit', 'on', 'bindings', 'loading'],
    setup(ctx: RegistryComponentProps, { slots }) {
      const collapsed = ref(false)
      return () => {
        const { title, collapsible } = ctx.element.props
        return h('div', {
          class: 'jr-card',
          style: {
            border: '1px solid var(--jr-border, rgba(128,128,128,0.2))',
            borderRadius: '6px',
            overflow: 'hidden',
          },
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
              borderBottom: collapsed.value ? 'none' : '1px solid var(--jr-border, rgba(128,128,128,0.2))',
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
  }),

  Text: defineComponent({
    name: 'JrText',
    props: ['element', 'emit', 'on', 'bindings', 'loading'],
    setup(ctx: RegistryComponentProps) {
      return () => {
        const { content, variant = 'body' } = ctx.element.props
        const styles: Record<string, Record<string, string>> = {
          heading: { fontSize: '16px', fontWeight: '600', lineHeight: '1.4' },
          body: { fontSize: '13px', lineHeight: '1.5' },
          caption: { fontSize: '12px', opacity: '0.7', lineHeight: '1.4' },
          code: { fontSize: '12px', fontFamily: 'monospace', backgroundColor: 'rgba(128,128,128,0.1)', padding: '2px 6px', borderRadius: '3px' },
        }
        const tag = variant === 'heading' ? 'h3' : variant === 'code' ? 'code' : 'p'
        return h(tag, { class: `jr-text jr-text-${variant}`, style: { margin: 0, ...styles[variant] } }, content)
      }
    },
  }),

  Badge: defineComponent({
    name: 'JrBadge',
    props: ['element', 'emit', 'on', 'bindings', 'loading'],
    setup(ctx: RegistryComponentProps) {
      return () => {
        const { text, variant = 'default' } = ctx.element.props
        const colors: Record<string, { bg: string, fg: string }> = {
          info: { bg: 'rgba(59,130,246,0.15)', fg: 'rgb(59,130,246)' },
          success: { bg: 'rgba(34,197,94,0.15)', fg: 'rgb(34,197,94)' },
          warning: { bg: 'rgba(234,179,8,0.15)', fg: 'rgb(234,179,8)' },
          error: { bg: 'rgba(239,68,68,0.15)', fg: 'rgb(239,68,68)' },
          default: { bg: 'rgba(128,128,128,0.15)', fg: 'inherit' },
        }
        const c = colors[variant] || colors.default
        return h('span', {
          class: `jr-badge jr-badge-${variant}`,
          style: {
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: '500',
            backgroundColor: c.bg,
            color: c.fg,
          },
        }, text)
      }
    },
  }),

  Button: defineComponent({
    name: 'JrButton',
    props: ['element', 'emit', 'on', 'bindings', 'loading'],
    setup(ctx: RegistryComponentProps) {
      return () => {
        const { label, variant = 'secondary', disabled } = ctx.element.props
        const press = ctx.on('press')
        const styles: Record<string, Record<string, string>> = {
          primary: { backgroundColor: 'var(--jr-primary, #3b82f6)', color: '#fff' },
          secondary: { backgroundColor: 'rgba(128,128,128,0.1)', color: 'inherit' },
          ghost: { backgroundColor: 'transparent', color: 'inherit' },
          danger: { backgroundColor: 'rgba(239,68,68,0.15)', color: 'rgb(239,68,68)' },
        }
        return h('button', {
          class: `jr-button jr-button-${variant}`,
          disabled,
          style: {
            padding: '6px 12px',
            borderRadius: '4px',
            border: 'none',
            fontSize: '12px',
            fontWeight: '500',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? '0.5' : '1',
            whiteSpace: 'nowrap',
            ...styles[variant],
          },
          onClick: () => press.emit(),
        }, label)
      }
    },
  }),

  Icon: defineComponent({
    name: 'JrIcon',
    props: ['element', 'emit', 'on', 'bindings', 'loading'],
    setup(ctx: RegistryComponentProps) {
      return () => {
        const { name, size = 20 } = ctx.element.props
        return h('span', {
          class: name,
          style: { fontSize: `${size}px`, lineHeight: '1' },
        })
      }
    },
  }),

  Divider: defineComponent({
    name: 'JrDivider',
    props: ['element', 'emit', 'on', 'bindings', 'loading'],
    setup(ctx: RegistryComponentProps) {
      return () => {
        const { label } = ctx.element.props
        if (label) {
          return h('div', {
            class: 'jr-divider',
            style: { display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' },
          }, [
            h('hr', { style: { flex: 1, border: 'none', borderTop: '1px solid var(--jr-border, rgba(128,128,128,0.2))' } }),
            h('span', { style: { fontSize: '11px', opacity: 0.5 } }, label),
            h('hr', { style: { flex: 1, border: 'none', borderTop: '1px solid var(--jr-border, rgba(128,128,128,0.2))' } }),
          ])
        }
        return h('hr', {
          class: 'jr-divider',
          style: { border: 'none', borderTop: '1px solid var(--jr-border, rgba(128,128,128,0.2))', margin: '4px 0' },
        })
      }
    },
  }),

  TextInput: defineComponent({
    name: 'JrTextInput',
    props: ['element', 'emit', 'on', 'bindings', 'loading'],
    setup(ctx: RegistryComponentProps) {
      return () => {
        const { placeholder, label, disabled } = ctx.element.props
        const [value, setValue] = useBoundProp<string>(ctx.element.props.value, ctx.bindings?.value)
        const change = ctx.on('change')

        const input = h('input', {
          class: 'jr-text-input',
          type: 'text',
          value: value ?? '',
          placeholder,
          disabled,
          style: {
            flex: '1',
            padding: '6px 10px',
            border: '1px solid var(--jr-border, rgba(128,128,128,0.3))',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: 'transparent',
            color: 'inherit',
            outline: 'none',
            minWidth: '0',
          },
          onInput: (e: Event) => {
            const val = (e.target as HTMLInputElement).value
            setValue(val)
            change.emit()
          },
        })

        if (label) {
          return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', flex: '1' } }, [
            h('label', { style: { fontSize: '12px', fontWeight: '500' } }, label),
            input,
          ])
        }
        return input
      }
    },
  }),

  KeyValueTable: defineComponent({
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
              style: { borderBottom: '1px solid var(--jr-border, rgba(128,128,128,0.1))' },
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
  }),

  DataTable: defineComponent({
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
            border: '1px solid var(--jr-border, rgba(128,128,128,0.2))',
            borderRadius: '4px',
          },
        }, [
          h('table', {
            style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
          }, [
            h('thead', [
              h('tr', {
                style: { borderBottom: '1px solid var(--jr-border, rgba(128,128,128,0.2))' },
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
                    backgroundColor: 'var(--jr-bg, inherit)',
                  },
                }, col.label),
              )),
            ]),
            h('tbody', rows.map((row: any, index: number) =>
              h('tr', {
                key: index,
                style: {
                  borderBottom: '1px solid var(--jr-border, rgba(128,128,128,0.08))',
                  cursor: rowClick.bound ? 'pointer' : undefined,
                },
                onClick: rowClick.bound ? () => rowClick.emit() : undefined,
                onMouseenter: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(128,128,128,0.05)' },
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
  }),

  CodeBlock: defineComponent({
    name: 'JrCodeBlock',
    props: ['element', 'emit', 'on', 'bindings', 'loading'],
    setup(ctx: RegistryComponentProps) {
      return () => {
        const { code, filename, maxHeight } = ctx.element.props
        return h('div', { class: 'jr-code-block' }, [
          filename && h('div', {
            style: {
              padding: '4px 12px',
              fontSize: '11px',
              opacity: '0.6',
              borderBottom: '1px solid var(--jr-border, rgba(128,128,128,0.2))',
              fontFamily: 'monospace',
            },
          }, filename),
          h('pre', {
            style: {
              margin: 0,
              padding: '12px',
              fontSize: '12px',
              lineHeight: '1.5',
              fontFamily: 'monospace',
              backgroundColor: 'rgba(128,128,128,0.05)',
              borderRadius: filename ? '0 0 4px 4px' : '4px',
              overflow: 'auto',
              maxHeight,
            },
          }, [h('code', code)]),
        ])
      }
    },
  }),

  Progress: defineComponent({
    name: 'JrProgress',
    props: ['element', 'emit', 'on', 'bindings', 'loading'],
    setup(ctx: RegistryComponentProps) {
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
              backgroundColor: 'rgba(128,128,128,0.15)',
              borderRadius: '3px',
              overflow: 'hidden',
            },
          }, [
            h('div', {
              style: {
                height: '100%',
                width: `${percent}%`,
                backgroundColor: 'var(--jr-primary, #3b82f6)',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              },
            }),
          ]),
        ])
      }
    },
  }),

  Tree: defineComponent({
    name: 'JrTree',
    props: ['element', 'emit', 'on', 'bindings', 'loading'],
    setup(ctx: RegistryComponentProps) {
      function renderNode(value: unknown, key: string, depth: number, expandLevel: number): VNode {
        const isExpanded = ref(depth < expandLevel)
        const isObject = value !== null && typeof value === 'object'

        if (!isObject) {
          return h('div', {
            style: { padding: '2px 0', fontSize: '12px', fontFamily: 'monospace', paddingLeft: `${depth * 16}px` },
          }, [
            h('span', { style: { opacity: 0.6 } }, `${key}: `),
            h('span', { style: { color: typeof value === 'string' ? '#a5d6ad' : '#dcdcaa' } }, JSON.stringify(value)),
          ])
        }

        const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v] as const) : Object.entries(value as Record<string, unknown>)
        const label = Array.isArray(value) ? `${key} [${entries.length}]` : `${key} {${entries.length}}`

        return h('div', { style: { paddingLeft: `${depth * 16}px` } }, [
          h('div', {
            style: { padding: '2px 0', fontSize: '12px', fontFamily: 'monospace', cursor: 'pointer', userSelect: 'none' },
            onClick: () => { isExpanded.value = !isExpanded.value },
          }, [
            h('span', { style: { opacity: 0.5, marginRight: '4px' } }, isExpanded.value ? '▼' : '▶'),
            h('span', { style: { opacity: 0.8 } }, label),
          ]),
          isExpanded.value && entries.map(([k, v]) => renderNode(v, k, depth + 1, expandLevel)),
        ])
      }

      return () => {
        const { data, expandLevel = 1 } = ctx.element.props
        if (data === null || data === undefined) {
          return h('span', { style: { fontSize: '12px', opacity: 0.5 } }, 'null')
        }
        return h('div', { class: 'jr-tree' }, [renderNode(data, 'root', 0, expandLevel)])
      }
    },
  }),
}
