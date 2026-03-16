import type { RegistryComponentProps } from './types'
import { useBoundProp } from '@json-render/vue'
import { defineComponent, h } from 'vue'
import { borderInput, borderSolid } from './tokens'

export const TextInput = defineComponent({
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
          border: borderSolid(borderInput),
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
})
