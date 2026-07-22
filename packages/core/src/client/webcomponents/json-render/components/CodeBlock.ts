import type { RegistryComponentProps } from './types'
import { defineComponent, h } from 'vue'
import { borderSolid, surfaceMuted } from './tokens'

export const CodeBlock = defineComponent({
  name: 'JrCodeBlock',
  props: ['element', 'emit', 'on', 'bindings', 'loading'],
  setup(ctx: RegistryComponentProps) {
    return () => {
      const { code, filename, language, height } = ctx.element.props
      const header = filename || language
      return h('div', { class: 'jr-code-block' }, [
        header && h('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '4px 12px',
            fontSize: '11px',
            opacity: '0.6',
            borderBottom: borderSolid(),
            fontFamily: 'monospace',
          },
        }, [
          h('span', filename ?? ''),
          language && h('span', { style: { textTransform: 'uppercase' } }, language),
        ]),
        h('pre', {
          style: {
            margin: 0,
            padding: '12px',
            fontSize: '12px',
            lineHeight: '1.5',
            fontFamily: 'monospace',
            backgroundColor: surfaceMuted,
            borderRadius: header ? '0 0 4px 4px' : '4px',
            overflow: 'auto',
            scrollbarGutter: 'stable',
            maxHeight: height != null ? `${height}px` : undefined,
          },
        }, [h('code', code)]),
      ])
    }
  },
})
