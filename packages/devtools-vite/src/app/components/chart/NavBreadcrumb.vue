<script setup lang="ts" generic="T extends { id: string; text?: string; parent?: T }">
import type { GraphBaseOptions } from 'nanovis'
import { computed } from 'vue'

const props = defineProps<{
  selected?: T
  options: GraphBaseOptions<any>
}>()

const emit = defineEmits<{
  (e: 'select', node: T | null): void
}>()

const parentStack = computed(() => {
  const stack: T[] = []
  let current = props.selected
  while (current) {
    stack.unshift(current)
    current = current.parent
  }
  return stack
})
</script>

<template>
  <div flex="~ gap-1 items-center wrap">
    <template v-for="node, idx of parentStack" :key="node.id">
      <div v-if="idx > 0" i-ph-arrow-right-bold text-sm op-fade />
      <button
        hover="bg-active" rounded px1
        @click="emit('select', node)"
      >
        <span>{{ node.text || node.id }}</span>
      </button>
    </template>
  </div>
</template>
