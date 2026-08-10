import { useBoundProp } from '@json-render/vue'
import { defineComponent, h } from 'vue'
import { useUncontrolledValue } from '../composables/useUncontrolledValue'
import { primary, surfaceSubtle } from './tokens'
import { registryProps } from './types'

export interface SwitchProps {
  /** Two-way bindable via `{ $bindState: '...' }`. */
  value?: boolean
  label?: string
  disabled?: boolean
}

export const Switch = defineComponent({
  name: 'JrSwitch',
  props: registryProps<'Switch', SwitchProps>(),
  setup(ctx) {
    /** Local, session-persisted fallback for when `value` has no `$bindState` binding — `useBoundProp`'s setter is a no-op without one. */
    const uncontrolledValue = useUncontrolledValue(ctx, 'value', ctx.element.props.value)
    const controlled = ctx.bindings?.value != null

    return () => {
      const { label, disabled } = ctx.element.props
      const [boundValue, setBoundValue] = useBoundProp<boolean>(ctx.element.props.value, ctx.bindings?.value)
      const value = controlled ? boundValue : uncontrolledValue.value
      const setValue = (next: boolean) => {
        if (controlled)
          setBoundValue(next)
        else uncontrolledValue.value = next
      }
      const change = ctx.on('change')
      const checked = !!value

      const track = h('button', {
        'type': 'button',
        'role': 'switch',
        'aria-checked': checked ? 'true' : 'false',
        disabled,
        'class': 'jr-switch',
        'style': {
          position: 'relative',
          flexShrink: '0',
          width: '36px',
          height: '20px',
          padding: '0',
          border: 'none',
          borderRadius: '10px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? '0.5' : '1',
          backgroundColor: checked ? primary : surfaceSubtle,
          transition: 'background-color 0.15s ease',
        },
        'onClick': () => {
          setValue(!checked)
          change.emit()
        },
      }, [
        h('span', {
          style: {
            position: 'absolute',
            top: '2px',
            left: '2px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            transform: checked ? 'translateX(16px)' : 'translateX(0)',
            transition: 'transform 0.15s ease',
          },
        }),
      ])

      if (label) {
        return h('label', {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
          },
        }, [
          track,
          h('span', { style: { fontSize: '12px' } }, label),
        ])
      }
      return track
    }
  },
})
