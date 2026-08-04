import type { MaybeElementRef } from '@vueuse/core'
import type { PropType, VNode } from 'vue'
import type { FloatingPopoverProps } from '../../state/floating-tooltip'
import { onClickOutside, useDebounceFn, useEventListener } from '@vueuse/core'
import { defineComponent, h, nextTick, onMounted, onUpdated, reactive, ref, useTemplateRef, watch } from 'vue'
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
    /** Appended to the panel's class list — lets a consumer replace the default tooltip padding (e.g. a listbox). */
    panelClass: {
      type: [String, Array] as PropType<string | string[]>,
      required: false,
    },
    /** Elements `dismissOnClickOutside` should not treat as "outside" — typically the trigger that toggles this popover. */
    ignore: {
      type: Array as PropType<MaybeElementRef[]>,
      required: false,
    },
  },
  emits: ['dismiss'],
  setup(props, { emit }) {
    const panel = useTemplateRef<HTMLDivElement>('panel')
    const el = ref(props.item?.el)
    const renderCounter = ref(0)

    const panelSize = reactive({ width: 0, height: 0 })
    // Before the first measurement, `resolveFloatingPosition` centers the panel
    // under the anchor via `transform: translateX(-50%)` (it doesn't know the
    // panel's real width yet); once measured, it switches to an absolute `left`
    // with no transform. Both resolve to the same visual position, but
    // transitioning `left` and `transform` independently between them produces
    // a visible sideways wobble — so `measured` only flips (re-enabling the
    // transition) a tick after `panelSize` updates, letting that one
    // size-correcting render apply instantly rather than animate.
    const measured = ref(false)

    function measurePanel() {
      if (!props.item || !panel.value)
        return
      const { width, height } = panel.value.getBoundingClientRect()
      if (Math.abs(width - panelSize.width) > 0.5 || Math.abs(height - panelSize.height) > 0.5) {
        panelSize.width = width
        panelSize.height = height
      }
      nextTick(() => {
        measured.value = true
      })
    }

    onMounted(measurePanel)
    onUpdated(measurePanel)

    useEventListener(window, 'resize', () => {
      if (el.value)
        renderCounter.value++
    })

    // The panel is `position: fixed` against a rect measured at render time, so
    // scrolling any ancestor (not just the window) needs to trigger a re-measure.
    useEventListener(window, 'scroll', () => {
      if (el.value)
        renderCounter.value++
    }, { capture: true, passive: true })

    const clearThrottled = useDebounceFn(() => {
      if (props.item?.el == null) {
        el.value = undefined
        panelSize.width = 0
        panelSize.height = 0
        measured.value = false
      }
    }, 800)

    if (props.dismissOnClickOutside) {
      onClickOutside(panel, () => {
        emit('dismiss')
      }, { ignore: props.ignore })
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

      const transitionClass = measured.value ? 'transition-all duration-300' : 'transition-opacity duration-300'

      // When dismissing (item is null), keep the last known position
      // so the popover fades out in place instead of jumping
      if (!props.item) {
        return h(
          'div',
          {
            ref: 'panel',
            class: [
              `fixed z-floating-tooltip text-xs ${transitionClass} w-max bg-glass:80 color-base border border-base rounded px2 p1`,
              'op0 pointer-events-none',
              props.panelClass,
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
            `fixed z-floating-tooltip text-xs ${transitionClass} w-max bg-glass:80 color-base border border-base rounded px2 p1`,
            props.item ? 'op100' : 'op0 pointer-events-none',
            props.panelClass,
          ],
          style,
        },
        content,
      )
    }
  },
})

export default FloatingPopoverComponent
