import type { RegistryComponentProps } from './types'
import { defineComponent, h } from 'vue'
import { surfaceSubtle } from './tokens'

export const Text = defineComponent({
  name: 'JrText',
  props: ['element', 'emit', 'on', 'bindings', 'loading'],
  setup(ctx: RegistryComponentProps) {
    return () => {
      const { text, variant = 'body', weight } = ctx.element.props
      const styles: Record<string, Record<string, string>> = {
        heading: { fontSize: '16px', fontWeight: '600', lineHeight: '1.4' },
        subheading: { fontSize: '14px', fontWeight: '500', lineHeight: '1.4' },
        body: { fontSize: '13px', lineHeight: '1.5' },
        caption: { fontSize: '12px', opacity: '0.7', lineHeight: '1.4' },
        code: { fontSize: '12px', fontFamily: 'monospace', backgroundColor: surfaceSubtle, padding: '2px 6px', borderRadius: '3px' },
      }
      const weights: Record<string, string> = { bold: '700', medium: '500', normal: '400' }
      const tag = variant === 'heading' || variant === 'subheading' ? 'h3' : variant === 'code' ? 'code' : 'p'
      return h(tag, {
        class: `jr-text jr-text-${variant}`,
        style: { margin: 0, ...styles[variant] ?? styles.body, ...(weight ? { fontWeight: weights[weight] ?? weights.normal } : {}) },
      }, text)
    }
  },
})
