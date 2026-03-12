<script setup lang="ts">
defineProps<{
  label: string
  items: string[]
  active: Set<string>
  /** Map item key → { icon, color, label } for styled items */
  styles?: Record<string, { icon?: string, color?: string, label?: string }>
  /** Compute inline color via hash for items without predefined styles */
  hashColor?: (item: string) => string
}>()

defineEmits<{
  toggle: [item: string]
}>()
</script>

<template>
  <span class="text-xs op40">{{ label }}</span>
  <div class="flex flex-wrap items-center gap-0">
    <button
      v-for="item of items"
      :key="item"
      class="px-1.5 py-0.5 rounded text-xs flex items-center gap-0.5 hover:bg-active transition"
      :class="[
        active.size === 0 || active.has(item)
          ? (styles?.[item]?.color || '')
          : 'op30',
      ]"
      :style="!styles?.[item]?.color && hashColor ? { color: active.size === 0 || active.has(item) ? hashColor(item) : undefined } : undefined"
      @click="$emit('toggle', item)"
    >
      <div v-if="styles?.[item]?.icon" :class="styles[item]!.icon" class="w-3.5 h-3.5" />
      <span>{{ styles?.[item]?.label || item }}</span>
    </button>
  </div>
</template>
