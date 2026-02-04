<script setup lang="ts" generic="T">
import DisplayNumberBadge from '@vitejs/devtools-ui/components/DisplayNumberBadge.vue'
import { computed } from 'vue'

const props = defineProps<{
  list: T[]
}>()

const count = defineModel('count', {
  default: 20,
})

const initialCount = count.value

const top = computed(() => props.list.slice(0, count.value))
</script>

<template>
  <div relative>
    <slot :items="top" />
    <div
      v-if="list.length > count"
      pointer-events-none absolute left-0 right-0 bottom-0 bg-gradient-more h-30
      flex="~ justify-center"
    >
      <button
        op35 p2 pt4 mta
        pointer-events-auto
        hover:op100
        flex="~ items-center gap-1 justify-center"
        @click="count = Math.round(count + initialCount)"
      >
        <div i-ri:arrow-down-double-line />
        <span>More</span>
        <DisplayNumberBadge prefix="+" :number="Math.min(Math.round(initialCount), props.list.length - count)" rounded-full text-sm />
      </button>
      <button
        op35 p2 pt4 mta
        pointer-events-auto
        hover:op100
        flex="~ items-center gap-1 justify-center"
        @click="count = props.list.length"
      >
        <div i-ph-arrows-out-line-vertical-duotone />
        <span>All</span>
        <DisplayNumberBadge :number="props.list.length" rounded-full text-sm />
      </button>
    </div>
  </div>
</template>
