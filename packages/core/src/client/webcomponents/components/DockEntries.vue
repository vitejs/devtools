<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import { toRefs } from 'vue'
import DockEntry from './DockEntry.vue'

const props = defineProps<{
  entries: DevToolsDockEntry[]
  selected: DevToolsDockEntry | null
  isVertical: boolean
}>()

const emit = defineEmits<{
  (e: 'select', entry: DevToolsDockEntry): void
}>()

const { selected, isVertical, entries } = toRefs(props)

function toggleDockEntry(dock: DevToolsDockEntry) {
  if (selected.value?.id === dock.id)
    emit('select', undefined!)
  else
    emit('select', dock)
}
</script>

<template>
  <div>
    <template v-for="dock of entries" :key="dock.id">
      <DockEntry
        v-if="!dock.isHidden"
        :dock
        :is-selected="selected?.id === dock.id"
        :is-dimmed="selected ? (selected.id !== dock.id) : false"
        :is-vertical="isVertical"
        @click="toggleDockEntry(dock)"
      />
    </template>
  </div>
</template>
