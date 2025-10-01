<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import { toRefs } from 'vue'

const props = defineProps<{
  selected?: DevToolsDockEntry
  isVertical: boolean
  entries: DevToolsDockEntry[]
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
  <div
    class="flex items-center w-full h-full justify-center transition-opacity duration-300"
  >
    <button
      v-for="dock of entries"
      :key="dock.id"
      :title="dock.title"
      :class="[
        isVertical ? 'rotate-270' : '',
        selected ? selected.id !== dock.id ? 'op50 saturate-0' : 'scale-120' : '',
      ]"
      class="flex items-center justify-center p1.5 rounded-xl hover:bg-[#8881] hover:scale-120 transition-all duration-300"
      @click="toggleDockEntry(dock)"
    >
      <img
        :src="dock.icon"
        :alt="dock.title"
        class="w-5 h-5 select-none"
        draggable="false"
      >
    </button>
  </div>
</template>
