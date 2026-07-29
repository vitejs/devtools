import { defineComponent, h } from 'vue'
import { registryProps, useIconSvg } from './types'

export interface IconProps {
  name?: string
  size?: number
}

export const Icon = defineComponent({
  name: 'JrIcon',
  props: registryProps<'Icon', IconProps>(),
  setup(ctx) {
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
