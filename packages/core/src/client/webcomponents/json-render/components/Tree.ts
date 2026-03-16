import type { VNode } from 'vue'
import type { RegistryComponentProps } from './types'
import { defineComponent, h, ref } from 'vue'
import { syntaxNumber, syntaxString } from './tokens'

export const Tree = defineComponent({
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
          h('span', { style: { color: typeof value === 'string' ? syntaxString : syntaxNumber } }, JSON.stringify(value)),
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
})
