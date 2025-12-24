<script setup lang="ts">
import { computed } from 'vue'
import IconifyIcon from './IconifyIcon.vue'
import VitePlusCore from './icons/VitePlusCore.vue'

const props = defineProps<{
  icon: string | { dark: string, light: string }
  title?: string
}>()

const icon = computed(() => {
  if (typeof props.icon === 'string') {
    return {
      dark: props.icon,
      light: props.icon,
    }
  }
  return props.icon
})
</script>

<template>
  <VitePlusCore v-if="icon.light === 'builtin:vite-plus-core'" />
  <div v-else>
    <template v-if="icon.light === icon.dark">
      <IconifyIcon :icon="icon.light" :title="title" />
    </template>
    <template v-else>
      <IconifyIcon class="dark-hidden" :icon="icon.light" :title="title" />
      <IconifyIcon class="light-hidden" :icon="icon.dark" :title="title" />
    </template>
  </div>
</template>
