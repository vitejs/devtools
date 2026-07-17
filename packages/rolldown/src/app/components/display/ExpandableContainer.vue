<script setup lang="ts" generic="T">
import DisplayNumberBadge from '@vitejs/devtools-ui/components/Display/DisplayNumberBadge.vue'
import { computed } from 'vue'

const props = defineProps<{
  list: T[]
}>()

const count = defineModel<number>('count', {
  default: 20,
})

const initialCount = count.value

const top = computed(() => props.list.slice(0, count.value))
</script>

<template>
  <div class="relative">
    <slot :items="top" />
    <div
      v-if="list.length > count"
      class="pointer-events-none absolute left-0 right-0 bottom-0 bg-gradient-more h-30 flex justify-center"
    >
      <button
        class="op35 p2 pt4 mta pointer-events-auto hover:op100 flex items-center gap-1 justify-center"
        @click="count = Math.round(count + initialCount)"
      >
        <div class="i-ri:arrow-down-double-line" />
        <span>More</span>
        <DisplayNumberBadge prefix="+" :number="Math.min(Math.round(initialCount), props.list.length - count)" class="rounded-full text-sm" />
      </button>
      <button
        class="op35 p2 pt4 mta pointer-events-auto hover:op100 flex items-center gap-1 justify-center"
        @click="count = props.list.length"
      >
        <div class="i-ph-arrows-out-line-vertical-duotone" />
        <span>All</span>
        <DisplayNumberBadge :number="props.list.length" class="rounded-full text-sm" />
      </button>
    </div>
  </div>
</template>
