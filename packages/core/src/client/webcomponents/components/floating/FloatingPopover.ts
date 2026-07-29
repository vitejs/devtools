import type { PropType, VNode } from 'vue'
import type { FloatingPopoverProps } from '../../state/floating-tooltip'
import { onClickOutside, useDebounceFn, useEventListener } from '@vueuse/core'
import { defineComponent, h, onMounted, onUpdated, reactive, ref, useTemplateRef, watch } from 'vue'
import { resolveFloatingPosition } from './floating-position'

// @unocss-include

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

    const panelSize = reactive({ width: 0, height: 0 })

    function measurePanel() {
      if (!props.item || !panel.value)
        return
      const { width, height } = panel.value.getBoundingClientRect()
      if (Math.abs(width - panelSize.width) > 0.5 || Math.abs(height - panelSize.height) > 0.5) {
        panelSize.width = width
        panelSize.height = height
      }
    }

    onMounted(measurePanel)
    onUpdated(measurePanel)

    useEventListener(window, 'resize', () => {
      if (el.value)
        renderCounter.value++
    })

    const clearThrottled = useDebounceFn(() => {
      if (props.item?.el == null) {
        el.value = undefined
        panelSize.width = 0
        panelSize.height = 0
      }
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
    let previousStyle: Record<string, string> = {}

    return () => {
      // Force re-render to update the position
      // eslint-disable-next-line ts/no-unused-expressions
      renderCounter.value

      if (!el.value)
        return null

      // When dismissing (item is null), keep the last known position
      // so the popover fades out in place instead of jumping
      if (!props.item) {
        return h(
          'div',
          {
            ref: 'panel',
            class: [
              'fixed z-floating-tooltip text-xs transition-all duration-300 w-max bg-glass color-base border border-base rounded px2 p1',
              'op0 pointer-events-none',
            ],
            style: previousStyle,
          },
          previousContent,
        )
      }

      const rect = el.value.getBoundingClientRect()

      const { style } = resolveFloatingPosition({
        rect,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        panelWidth: panelSize.width,
        panelHeight: panelSize.height,
        gap: props.item.gap,
        placement: props.item.placement,
      })

      previousStyle = style

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
            'fixed z-floating-tooltip text-xs transition-all duration-300 w-max bg-glass color-base border border-base rounded px2 p1',
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
