import type { VNode } from 'vue'
import { shallowRef } from 'vue'

export interface FloatingPopoverProps {
  el: HTMLElement
  content: string | (() => VNode | undefined)
  gap?: number
}

const tooltip = shallowRef<FloatingPopoverProps | null>(null)
const docksOverflowPanel = shallowRef<FloatingPopoverProps | null>(null)
const dockContextMenu = shallowRef<FloatingPopoverProps | null>(null)

export function setFloatingTooltip(info: FloatingPopoverProps | null) {
  tooltip.value = info
}

export function useFloatingTooltip() {
  return tooltip
}

export function setDocksOverflowPanel(info: FloatingPopoverProps | null) {
  docksOverflowPanel.value = info
}

export function useDocksOverflowPanel() {
  return docksOverflowPanel
}

export function setDockContextMenu(info: FloatingPopoverProps | null) {
  dockContextMenu.value = info
}

export function useDockContextMenu() {
  return dockContextMenu
}
