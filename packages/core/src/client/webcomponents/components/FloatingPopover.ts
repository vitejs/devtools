import type { PropType, VNode } from 'vue'
import type { FloatingPopoverProps } from '../state/floating-tooltip'
import { onClickOutside, useDebounceFn } from '@vueuse/core'
import { defineComponent, h, ref, useTemplateRef, watch } from 'vue'

// @unocss-include

const DETECT_MARGIN = 100
const DEFAULT_GAP = 10

const FloatingPopoverComponent = defineComponent({
  name: 'FloatingPopover',
  props: {
    item: {
      type: Object as PropType<FloatingPopoverProps | null | undefined>,
      required: false,
    },
    dismissOnClickOutside: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['dismiss'],
  setup(props, { emit }) {
    const panel = useTemplateRef<HTMLDivElement>('panel')
    const el = ref(props.item?.el)
    const renderCounter = ref(0)

    const clearThrottled = useDebounceFn(() => {
      if (props.item?.el == null)
        el.value = undefined
    }, 800)

    if (props.dismissOnClickOutside) {
      onClickOutside(panel, () => {
        emit('dismiss')
      })
    }

    watch(
      () => props.item,
      (value) => {
        if (value) {
          if (el.value !== value.el)
            el.value = value.el
          else
            renderCounter.value++
        }
        else {
          clearThrottled()
        }
      },
    )

    let previousContent: VNode | undefined

    return () => {
      // Force re-render to update the position
      // eslint-disable-next-line ts/no-unused-expressions
      renderCounter.value

      if (!el.value)
        return null

      const rect = el.value.getBoundingClientRect()

      // guess alignment of the tooltip based on viewport position
      let align: 'bottom' | 'left' | 'right' | 'top' = 'bottom'

      const vw = window.innerWidth
      const vh = window.innerHeight
      if (rect.left < DETECT_MARGIN)
        align = 'right'
      else if (rect.left + rect.width > vw - DETECT_MARGIN)
        align = 'left'
      else if (rect.top < DETECT_MARGIN)
        align = 'bottom'
      else if (rect.top + rect.height > vh - DETECT_MARGIN)
        align = 'top'

      let style: Record<string, string> = {}
      const gap = props.item?.gap ?? DEFAULT_GAP

      switch (align) {
        case 'bottom': {
          style = {
            left: `${rect.left + rect.width / 2}px`,
            top: `${rect.top + rect.height + gap}px`,
            transform: 'translateX(-50%)',
          }
          break
        }
        case 'top': {
          style = {
            left: `${rect.left + rect.width / 2}px`,
            bottom: `${vh - rect.top + gap}px`,
            transform: 'translateX(-50%)',
          }
          break
        }
        case 'left': {
          style = {
            right: `${vw - rect.left + gap}px`,
            top: `${rect.top + rect.height / 2}px`,
            transform: 'translateY(-50%)',
          }
          break
        }
        case 'right': {
          style = {
            left: `${rect.left + rect.width + gap}px`,
            top: `${rect.top + rect.height / 2}px`,
            transform: 'translateY(-50%)',
          }
          break
        }
      }

      const content = (
        typeof props.item?.content === 'string'
          ? h('span', props.item?.content)
          : props.item?.content()
      ) ?? previousContent

      previousContent = content

      return h(
        'div',
        {
          ref: 'panel',
          class: [
            'fixed z-floating-tooltip text-xs transition-all duration-300 w-max bg-glass border border-base rounded px2 p1',
            props.item ? 'op100' : 'op0 pointer-events-none',
          ],
          style,
        },
        content,
      )
    }
  },
})

export default FloatingPopoverComponent
