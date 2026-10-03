import { useEventListener } from '@vueuse/core'
import { shallowRef } from 'vue'

export const isFlowmapSwapping = shallowRef(false)

if (import.meta.client) {
  useEventListener(window, ['pointerup', 'pointercancel', 'pointerleave'], () => {
    isFlowmapSwapping.value = false
  })
}
