import type { VNode } from 'vue'
import { shallowRef } from 'vue'

export interface FloatingTooltip {
  left: number
  top: number
  width: number
  height: number
  render: string | (() => VNode)
}

const state = shallowRef<FloatingTooltip | null>(null)

export function setFloatingTooltip(info: FloatingTooltip | null) {
  state.value = info
}

export function useFloatingTooltip() {
  return state
}
