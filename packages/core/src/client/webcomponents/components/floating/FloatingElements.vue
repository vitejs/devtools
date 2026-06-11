<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { setDockContextMenu, setDocksGroupPanel, setDocksOverflowPanel, setEdgePositionDropdown, useDockContextMenu, useDocksGroupPanel, useDocksOverflowPanel, useEdgePositionDropdown, useFloatingTooltip } from '../../state/floating-tooltip'
import FloatingPopover from './FloatingPopover'

const tooltip = useFloatingTooltip()
const docksOverflowPanel = useDocksOverflowPanel()
const docksGroupPanel = useDocksGroupPanel()
const dockContextMenu = useDockContextMenu()
const edgePositionDropdown = useEdgePositionDropdown()

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key !== 'Escape')
    return
  if (dockContextMenu.value)
    setDockContextMenu(null)
})
</script>

<template>
  <FloatingPopover :item="docksOverflowPanel" @dismiss="() => setDocksOverflowPanel(null)" />
  <FloatingPopover :item="docksGroupPanel" @dismiss="() => setDocksGroupPanel(null)" />
  <FloatingPopover :item="dockContextMenu" @dismiss="() => setDockContextMenu(null)" />
  <FloatingPopover :item="edgePositionDropdown" @dismiss="() => setEdgePositionDropdown(null)" />
  <FloatingPopover :item="tooltip" />
</template>
