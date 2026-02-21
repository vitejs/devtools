<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { setDockContextMenu, setDocksOverflowPanel, useDockContextMenu, useDocksOverflowPanel, useFloatingTooltip } from '../state/floating-tooltip'
import FloatingPopover from './FloatingPopover'

const tooltip = useFloatingTooltip()
const docksOverflowPanel = useDocksOverflowPanel()
const dockContextMenu = useDockContextMenu()

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key !== 'Escape')
    return
  if (dockContextMenu.value)
    setDockContextMenu(null)
})
</script>

<template>
  <FloatingPopover :item="dockContextMenu" @dismiss="() => setDockContextMenu(null)" />
  <FloatingPopover :item="docksOverflowPanel" @dismiss="() => setDocksOverflowPanel(null)" />
  <FloatingPopover :item="tooltip" />
</template>
