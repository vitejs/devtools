<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    time?: number | Date
    colorize?: boolean
  }>(),
  {
    colorize: true,
  },
)

const date = computed(() => props.time
  ? new Date(props.time)
  : undefined,
)

const formatter = Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})
const dateTitle = computed(() => date.value ? formatter.format(date.value) : null)
</script>

<template>
  <DisplayDurationBadge
    v-if="date"
    v-tooltip="dateTitle"
    :title="dateTitle"
    :ms="Date.now() - +date"
    :colorize="props.colorize"
    mode="day"
  />
</template>
