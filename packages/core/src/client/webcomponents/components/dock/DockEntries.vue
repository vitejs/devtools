<script setup lang="ts">
import type { DevToolsDockEntry, WhenContext } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { evaluateWhen } from '@vitejs/devtools-kit'
import { computed, toRefs } from 'vue'
import DockEntry from './DockEntry.vue'

const props = defineProps<{
  context: DocksContext
  entries: DevToolsDockEntry[]
  selected: DevToolsDockEntry | null
  isVertical: boolean
}>()

const emit = defineEmits<{
  (e: 'select', entry: DevToolsDockEntry): void
}>()

const { selected, isVertical, entries } = toRefs(props)

const whenContext = computed<WhenContext>(() => ({
  clientType: props.context.clientType,
  dockOpen: props.context.panel.store.open,
  paletteOpen: props.context.commands.paletteOpen,
  dockSelectedId: props.context.docks.selectedId ?? '',
}))

function isDockVisible(dock: DevToolsDockEntry): boolean {
  if (!dock.when)
    return true
  return evaluateWhen(dock.when, whenContext.value)
}

function toggleDockEntry(dock: DevToolsDockEntry) {
  if (selected.value?.id === dock.id)
    emit('select', undefined!)
  else
    emit('select', dock)
}
</script>

<template>
  <template v-for="dock of entries" :key="dock.id">
    <DockEntry
      v-if="isDockVisible(dock)"
      :context="context"
      :dock
      :is-selected="selected?.id === dock.id"
      :is-dimmed="selected ? (selected.id !== dock.id) : false"
      :is-vertical="isVertical"
      :badge="dock.badge"
      @click="toggleDockEntry(dock)"
    />
  </template>
</template>
