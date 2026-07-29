import type { RegistryComponentProps } from './types'
import { defineComponent, h } from 'vue'
import { colors } from './tokens'

/**
 * Fallback rendered in place of any spec element whose `type` has no entry in
 * {@link devtoolsRegistry}. Passed as `Renderer`'s `fallback` prop (an
 * upstream `@json-render/vue` feature) so an unrecognized component type —
 * e.g. a spec authored against a newer base-catalog version than this
 * client's registry implements, or a plain typo — degrades to a visible,
 * inspectable placeholder instead of silently rendering nothing.
 */
export const UnsupportedComponent = defineComponent({
  name: 'JrUnsupportedComponent',
  props: ['element', 'emit', 'on', 'bindings', 'loading'],
  setup(ctx: RegistryComponentProps) {
    return () => {
      const type = ctx.element?.type ?? 'unknown'
      return h('div', {
        class: 'jr-unsupported',
        role: 'alert',
        title: `No renderer is registered for component type "${type}". It may belong to a newer base-catalog version than this client supports.`,
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'monospace',
          border: `1px dashed ${colors.warning.fg}`,
          backgroundColor: colors.warning.bg,
          color: colors.warning.fg,
        },
      }, [
        h('span', { 'aria-hidden': 'true' }, '⚠'),
        h('span', `Unsupported component: "${type}"`),
      ])
    }
  },
})
