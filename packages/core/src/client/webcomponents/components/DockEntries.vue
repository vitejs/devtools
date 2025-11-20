<script setup lang="ts">
import type { DevToolsDockEntryWithBuiltin } from '@vitejs/devtools-kit'
import { toRefs } from 'vue'
import DockEntry from './DockEntry.vue'

const props = defineProps<{
  entries: DevToolsDockEntryWithBuiltin[]
  selected: DevToolsDockEntryWithBuiltin | null
  isVertical: boolean
}>()

const emit = defineEmits<{
  (e: 'select', entry: DevToolsDockEntryWithBuiltin): void
}>()

const { selected, isVertical, entries } = toRefs(props)

function toggleDockEntry(dock: DevToolsDockEntryWithBuiltin) {
  if (selected.value?.id === dock.id)
    emit('select', undefined!)
  else
    emit('select', dock)
}
</script>

<template>
  <div>
    <DockEntry
      v-for="dock of entries"
      :key="dock.id"
      :dock
      :is-selected="selected?.id === dock.id"
      :is-dimmed="selected ? (selected.id !== dock.id) : false"
      :is-vertical="isVertical"
      @click="toggleDockEntry(dock)"
    />
  </div>
</template>
