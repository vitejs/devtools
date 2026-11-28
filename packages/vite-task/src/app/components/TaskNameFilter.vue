<script setup lang="ts">
import type { TaskNameSelection } from '../utils/task-name-selection'
import { Dropdown as VDropdown } from 'floating-vue'
import { computed, nextTick, ref } from 'vue'
import { isTaskNameSelected } from '../utils/task-name-selection'

const props = defineProps<{ names: string[] }>()
const selection = defineModel<TaskNameSelection>({ required: true })
const active = computed(() => selection.value.mode === 'include' || selection.value.names.size > 0)
const selectedNames = computed(() => props.names.filter(name => isTaskNameSelected(selection.value, name)))
const label = computed(() => {
  if (!active.value)
    return 'Task name'
  return selectedNames.value.length === 1 ? `Task name: ${selectedNames.value[0]}` : `Task names · ${selectedNames.value.length}`
})
const query = ref('')
const trigger = ref<HTMLButtonElement>()
const searchInput = ref<HTMLInputElement>()
const visibleNames = computed(() => props.names.filter(name => name.toLowerCase().includes(query.value.trim().toLowerCase())))

function toggleName(name: string) {
  const names = new Set(selection.value.names)
  if (names.has(name))
    names.delete(name)
  else
    names.add(name)
  selection.value = { mode: selection.value.mode, names }
}
</script>

<template>
  <VDropdown placement="bottom-end" no-auto-focus @apply-show="nextTick(() => searchInput?.focus())">
    <template #default="{ shown }">
      <button ref="trigger" class="btn-action whitespace-nowrap focus-visible:bg-active focus-visible:op100 focus-visible:outline-none" :class="{ 'bg-active': active }" :aria-expanded="shown">
        <span class="truncate max-w-32">{{ label }}</span>
        <span aria-hidden="true" class="i-ph-caret-down-duotone shrink-0 op60" />
      </button>
    </template>
    <template #popper="{ hide }">
      <div class="w-60 max-w-80vw text-sm" @keydown.esc.stop.prevent="hide(); trigger?.focus()">
        <div class="flex items-center gap2 px3 border-b border-base">
          <span aria-hidden="true" class="i-ph-magnifying-glass-duotone op40 flex-none" />
          <input ref="searchInput" v-model="query" aria-label="Search task names" placeholder="Search task names" class="min-w-0 flex-1 bg-transparent py2 outline-none">
          <button
            class="flex shrink-0 p1 rounded op70 hover:bg-active hover:op100"
            :title="selectedNames.length ? 'Select none' : 'Select all'"
            :aria-label="selectedNames.length ? 'Select none' : 'Select all'"
            @click="selection = { mode: selectedNames.length ? 'include' : 'exclude', names: new Set() }"
          >
            <span :class="selectedNames.length ? 'i-ph-selection-plus-duotone' : 'i-ph-selection-slash-duotone'" />
          </button>
        </div>
        <div class="max-h-56 of-auto p1">
          <label v-for="name in visibleNames" :key="name" class="flex items-center gap2 px2 py1 rounded hover:bg-active">
            <input type="checkbox" :checked="isTaskNameSelected(selection, name)" @change="toggleName(name)">
            <span class="break-all">{{ name }}</span>
          </label>
          <div v-if="!visibleNames.length" class="px2 py1 op60">
            No matching names
          </div>
        </div>
      </div>
    </template>
  </VDropdown>
</template>
