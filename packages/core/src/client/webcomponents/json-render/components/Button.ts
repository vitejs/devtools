import type { RegistryComponentProps } from './types'
import { defineComponent, h } from 'vue'
import BaseButton from '../../components/display/Button.vue'
import DockIcon from '../../components/dock/DockIcon.vue'

type BaseVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
const VARIANTS = new Set<BaseVariant>(['primary', 'secondary', 'ghost', 'danger'])

export const Button = defineComponent({
  name: 'JrButton',
  props: ['element', 'emit', 'on', 'bindings', 'loading'],
  setup(ctx: RegistryComponentProps) {
    return () => {
      const { label, icon, variant = 'secondary', disabled } = ctx.element.props
      const press = ctx.on('press')
      const resolved: BaseVariant = VARIANTS.has(variant) ? variant : 'secondary'

      return h(BaseButton, {
        variant: resolved,
        size: 'sm',
        disabled,
        onClick: () => press.emit(),
      }, {
        icon: icon
          ? () => h(DockIcon, { icon, class: 'w-3.5 h-3.5' })
          : undefined,
        default: () => label,
      })
    }
  },
})
