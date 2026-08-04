import { useBoundProp } from '@json-render/vue'
import { defineComponent, h } from 'vue'
import DockIcon from '../../components/dock/DockIcon.vue'
import { borderInput, borderSolid } from './tokens'
import { registryProps } from './types'

export interface TextInputProps {
  /** Two-way bindable via `{ $bindState: '...' }`. */
  value?: string
  placeholder?: string
  label?: string
  type?: 'text' | 'search' | 'number' | 'password' | 'email'
  disabled?: boolean
  /** Implies `disabled` and shows a spinner alongside the input. */
  loading?: boolean
}

export const TextInput = defineComponent({
  name: 'JrTextInput',
  props: registryProps<'TextInput', TextInputProps>(),
  setup(ctx) {
    return () => {
      const { placeholder, label, type = 'text', disabled, loading } = ctx.element.props
      const [value, setValue] = useBoundProp<string>(ctx.element.props.value, ctx.bindings?.value)
      const change = ctx.on('change')

      const input = h('input', {
        class: 'jr-text-input',
        type,
        value: value ?? '',
        placeholder,
        disabled: disabled || loading,
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

      const field = loading
        ? h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', flex: '1' } }, [
            input,
            h(DockIcon, { icon: 'ph:spinner-gap-duotone', class: 'w-3.5 h-3.5 animate-spin flex-none' }),
          ])
        : input

      if (label) {
        return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', flex: '1' } }, [
          h('label', { style: { fontSize: '12px', fontWeight: '500' } }, label),
          field,
        ])
      }
      return field
    }
  },
})
