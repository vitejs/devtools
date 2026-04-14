import type { RegistryComponentProps } from './types'
import { defineComponent, h } from 'vue'
import { borderSolid, surfaceMuted } from './tokens'

export const CodeBlock = defineComponent({
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
            borderBottom: borderSolid(),
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
            backgroundColor: surfaceMuted,
            borderRadius: filename ? '0 0 4px 4px' : '4px',
            overflow: 'auto',
            maxHeight,
          },
        }, [h('code', code)]),
      ])
    }
  },
})
