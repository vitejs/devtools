<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import { toRefs } from 'vue'
import DockIcon from './DockIcon.vue'

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
    class="vite-devtools-dock-entries flex items-center w-full h-full justify-center transition-opacity duration-300"
  >
    <div
      v-for="dock of entries"
      :key="dock.id"
      class="relative group vite-devtools-dock-entry"
    >
      <button
        :title="dock.title"
        :class="[
          isVertical ? 'rotate-270' : '',
          selected ? selected.id !== dock.id ? 'op50 saturate-0' : 'scale-120' : '',
        ]"
        class="flex items-center justify-center p1.5 rounded-xl hover:bg-[#8881] hover:scale-120 transition-all duration-300 relative"
        @click="toggleDockEntry(dock)"
      >
        <DockIcon :icon="dock.icon" :title="dock.title" class="w-5 h-5 select-none" />
      </button>
      <div class="vite-devtools-dock-label text-xs group-hover:opacity-100 opacity-0 transition-opacity duration-300 w-max bg-glass border border-base z-10 rounded px2 absolute p1">
        {{ dock.title }}
      </div>
    </div>
  </div>
</template>
