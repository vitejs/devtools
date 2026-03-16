import type { RegistryComponentProps } from './types'
import { defineComponent, h } from 'vue'
import { useIconSvg } from './types'

export const Icon = defineComponent({
  name: 'JrIcon',
  props: ['element', 'emit', 'on', 'bindings', 'loading'],
  setup(ctx: RegistryComponentProps) {
    const iconSvg = useIconSvg(() => ctx.element.props.name)

    return () => {
      const { size = 20 } = ctx.element.props
      return h('span', {
        style: { display: 'inline-flex', width: `${size}px`, height: `${size}px`, lineHeight: '1' },
        innerHTML: iconSvg.value || '',
      })
    }
  },
})
