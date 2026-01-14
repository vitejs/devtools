import type { FloatingTooltip } from '../state/floating-tooltip'
import { computed, defineComponent, h, ref, watchEffect } from 'vue'
import { useFloatingTooltip } from '../state/floating-tooltip'

// @unocss-include

const DETECT_MARGIN = 100
const GAP = 10

const FloatingTooltipComponent = defineComponent({
  name: 'FloatingTooltip',
  setup() {
    const current = useFloatingTooltip()
    const box = ref<FloatingTooltip>({
      render: '',
      width: 0,
      height: 0,
      left: 0,
      top: 0,
    })

    // guess alignment of the tooltip based on viewport position
    const align = computed<'bottom' | 'left' | 'right' | 'top'>(() => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      if (box.value.left < DETECT_MARGIN)
        return 'right'
      if (box.value.left + box.value.width > vw - DETECT_MARGIN)
        return 'left'
      if (box.value.top < DETECT_MARGIN)
        return 'bottom'
      if (box.value.top + box.value.height > vh - DETECT_MARGIN)
        return 'top'
      return 'bottom'
    })

    const style = computed(() => {
      switch (align.value) {
        case 'bottom': {
          return {
            left: `${box.value.left + box.value.width / 2}px`,
            top: `${box.value.top + box.value.height + GAP}px`,
            transform: 'translateX(-50%)',
          }
        }
        case 'top': {
          return {
            left: `${box.value.left + box.value.width / 2}px`,
            bottom: `${window.innerHeight - box.value.top + GAP}px`,
            transform: 'translateX(-50%)',
          }
        }
        case 'left': {
          return {
            right: `${window.innerWidth - box.value.left + GAP}px`,
            top: `${box.value.top + box.value.height / 2}px`,
            transform: 'translateY(-50%)',
          }
        }
        case 'right': {
          return {
            left: `${box.value.left + box.value.width + GAP}px`,
            top: `${box.value.top + box.value.height / 2}px`,
            transform: 'translateY(-50%)',
          }
        }
        default: {
          throw new Error('Unreachable')
        }
      }
    })

    watchEffect(() => {
      if (current.value) {
        box.value = { ...current.value }
      }
    })

    return () => {
      if (!box.value.render)
        return null

      const content = typeof box.value.render === 'string' ? h('span', box.value.render) : box.value.render()

      return h(
        'div',
        {
          class: [
            'fixed z-floating-tooltip text-xs transition-all duration-300 w-max bg-glass border border-base rounded px2 p1',
            current ? 'op100' : 'op0 pointer-events-none',
          ],
          style: style.value,
        },
        content,
      )
    }
  },
})

export default FloatingTooltipComponent
