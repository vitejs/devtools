import type { PropType } from 'vue'
import type { FloatingPopoverProps } from '../state/floating-tooltip'
import { useDebounceFn, useElementBounding } from '@vueuse/core'
import { computed, defineComponent, h, reactive, ref, watch } from 'vue'

// @unocss-include

const DETECT_MARGIN = 100
const GAP = 10

const FloatingTooltipComponent = defineComponent({
  name: 'FloatingTooltip',
  props: {
    item: {
      type: Object as PropType<FloatingPopoverProps | null | undefined>,
      required: false,
    },
  },
  setup(props) {
    const el = ref(props.item?.el)
    const rect = reactive(useElementBounding(el))

    // guess alignment of the tooltip based on viewport position
    const align = computed<'bottom' | 'left' | 'right' | 'top'>(() => {
      if (!props.item?.el)
        return 'bottom'
      const vw = window.innerWidth
      const vh = window.innerHeight
      if (rect.left < DETECT_MARGIN)
        return 'right'
      if (rect.left + rect.width > vw - DETECT_MARGIN)
        return 'left'
      if (rect.top < DETECT_MARGIN)
        return 'bottom'
      if (rect.top + rect.height > vh - DETECT_MARGIN)
        return 'top'
      return 'bottom'
    })

    const style = computed(() => {
      if (!props.item?.el)
        return {}
      switch (align.value) {
        case 'bottom': {
          return {
            left: `${rect.left + rect.width / 2}px`,
            top: `${rect.top + rect.height + GAP}px`,
            transform: 'translateX(-50%)',
          }
        }
        case 'top': {
          return {
            left: `${rect.left + rect.width / 2}px`,
            bottom: `${window.innerHeight - rect.top + GAP}px`,
            transform: 'translateX(-50%)',
          }
        }
        case 'left': {
          return {
            right: `${window.innerWidth - rect.left + GAP}px`,
            top: `${rect.top + rect.height / 2}px`,
            transform: 'translateY(-50%)',
          }
        }
        case 'right': {
          return {
            left: `${rect.left + rect.width + GAP}px`,
            top: `${rect.top + rect.height / 2}px`,
            transform: 'translateY(-50%)',
          }
        }
        default: {
          throw new Error('Unreachable')
        }
      }
    })

    const clearThrottled = useDebounceFn(() => {
      if (props.item?.el == null)
        el.value = undefined
    }, 800)

    watch(
      () => props.item,
      (value) => {
        if (value) {
          if (el.value !== value.el)
            el.value = value.el
          else
            rect.update()
        }
        else {
          clearThrottled()
        }
      },
    )

    return () => {
      if (!props.item?.content)
        return null

      const content = typeof props.item.content === 'string' ? h('span', props.item.content) : props.item.content()

      return h(
        'div',
        {
          class: [
            'fixed z-floating-tooltip text-xs transition-all duration-300 w-max bg-glass border border-base rounded px2 p1',
            props.item ? 'op100' : 'op0 pointer-events-none',
          ],
          style: style.value,
        },
        content,
      )
    }
  },
})

export default FloatingTooltipComponent
