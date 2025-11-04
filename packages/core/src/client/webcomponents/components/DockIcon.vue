<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  icon: string
  title?: string
}>()

function getIconUrl(str: string, color: 'dark' | 'light') {
  if (str.includes('/'))
    return str
  const match = str.match(/^([\w-]+):([\w-]+)$/)
  if (match) {
    const [, collection, icon] = match
    return `https://api.iconify.design/${collection}/${icon}.svg${color === 'dark' ? '?color=%23eee' : '?color=%23111'}`
  }
  return str
}

const icon = computed(() => {
  return {
    dark: getIconUrl(props.icon, 'dark'),
    light: getIconUrl(props.icon, 'light'),
  }
})
</script>

<template>
  <picture>
    <source :srcset="icon.dark" media="(prefers-color-scheme: dark)">
    <source :srcset="icon.light" media="(prefers-color-scheme: light)">
    <img
      :src="icon.light"
      :alt="title"
      class="w-full h-full m-auto"
      draggable="false"
    >
  </picture>
</template>
