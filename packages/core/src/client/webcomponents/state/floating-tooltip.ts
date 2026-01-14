import type { VNode } from 'vue'
import { shallowRef } from 'vue'

export interface FloatingPopoverProps {
  el: HTMLElement
  content: string | (() => VNode)
}

const tooltip = shallowRef<FloatingPopoverProps | null>(null)

export function setFloatingTooltip(info: FloatingPopoverProps | null) {
  tooltip.value = info
}

export function useFloatingTooltip() {
  return tooltip
}
