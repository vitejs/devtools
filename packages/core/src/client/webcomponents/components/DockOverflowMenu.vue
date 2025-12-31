<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import { onClickOutside } from '@vueuse/core'
import { ref, useTemplateRef } from 'vue'
import DockIcon from './DockIcon.vue'

defineProps<{
  entries: DevToolsDockEntry[]
  selected: DevToolsDockEntry | null
  isVertical: boolean
}>()

const emit = defineEmits<{
  (e: 'select', entry: DevToolsDockEntry): void
}>()

const isOpen = ref(false)
const menuRef = useTemplateRef<HTMLDivElement>('menuRef')
const buttonRef = useTemplateRef<HTMLButtonElement>('buttonRef')

onClickOutside(menuRef, (event) => {
  if (buttonRef.value?.contains(event.target as Node))
    return
  isOpen.value = false
})

function toggleMenu() {
  isOpen.value = !isOpen.value
}

function selectEntry(entry: DevToolsDockEntry) {
  emit('select', entry)
  isOpen.value = false
}
</script>

<template>
  <div class="relative vite-devtools-dock-overflow">
    <button
      ref="buttonRef"
      title="More docks"
      class="flex items-center justify-center p1.5 rounded-xl hover:bg-[#8881] hover:scale-120 transition-all duration-300 relative"
      :class="[
        isVertical ? 'rotate-270' : '',
        isOpen ? 'bg-[#8882]' : '',
      ]"
      @click="toggleMenu"
    >
      <div class="i-ph:dots-three-bold w-5 h-5 op70" />
      <div
        v-if="entries.length > 0"
        class="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 rounded-full bg-purple text-white text-2.5 flex items-center justify-center px-0.5"
      >
        {{ entries.length }}
      </div>
    </button>

    <!-- Dropdown menu -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen && entries.length > 0"
        ref="menuRef"
        class="absolute z-1000 min-w-40 py-1 rounded-lg bg-[#1a1a1a] border border-[#333] shadow-xl"
        :class="isVertical
          ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
          : 'bottom-full left-1/2 -translate-x-1/2 mb-2'"
      >
        <button
          v-for="entry of entries"
          :key="entry.id"
          class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#333] transition-colors text-left"
          :class="selected?.id === entry.id ? 'bg-[#333] text-purple' : 'text-[#ccc]'"
          @click="selectEntry(entry)"
        >
          <DockIcon :icon="entry.icon" :title="entry.title" class="w-4 h-4 flex-none" />
          <span class="text-sm truncate">{{ entry.title }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>
