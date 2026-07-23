import type { VNode } from 'vue'
import { shallowRef } from 'vue'

export interface FloatingPopoverProps {
  el: HTMLElement
  content: string | (() => VNode | undefined)
  gap?: number
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

const tooltip = shallowRef<FloatingPopoverProps | null>(null)
const docksOverflowPanel = shallowRef<FloatingPopoverProps | null>(null)
const docksSidebarOverflowPanel = shallowRef<FloatingPopoverProps | null>(null)
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

/**
 * Dedicated slot for the group side nav's height-based "show more" flyout,
 * kept separate from {@link docksOverflowPanel} (the dock bar's overflow) and
 * {@link docksGroupPanel} (the bar group button's popover) so the rail's
 * show-more never fights those features over one shared ref.
 */
export function setDocksSidebarOverflowPanel(info: FloatingPopoverProps | null) {
  docksSidebarOverflowPanel.value = info
}

export function useDocksSidebarOverflowPanel() {
  return docksSidebarOverflowPanel
}

const docksGroupPanel = shallowRef<FloatingPopoverProps | null>(null)

export function setDocksGroupPanel(info: FloatingPopoverProps | null) {
  docksGroupPanel.value = info
}

export function useDocksGroupPanel() {
  return docksGroupPanel
}

export function setDockContextMenu(info: FloatingPopoverProps | null) {
  dockContextMenu.value = info
}

export function useDockContextMenu() {
  return dockContextMenu
}

const edgePositionDropdown = shallowRef<FloatingPopoverProps | null>(null)

export function setEdgePositionDropdown(info: FloatingPopoverProps | null) {
  edgePositionDropdown.value = info
}

export function useEdgePositionDropdown() {
  return edgePositionDropdown
}
