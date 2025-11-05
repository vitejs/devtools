<script setup lang="ts">
import { computed } from 'vue'
import VitePlusCore from './icons/VitePlusCore.vue'

const props = defineProps<{
  icon: string | { dark: string, light: string }
  title?: string
}>()

function getIconUrl(str: string, color: 'dark' | 'light') {
  if (str.includes('/') || str.startsWith('data:') || str.startsWith('builtin:'))
    return str
  const match = str.match(/^([\w-]+):([\w-]+)$/)
  if (match) {
    const [, collection, icon] = match
    return `https://api.iconify.design/${collection}/${icon}.svg${color === 'dark' ? '?color=%23eee' : '?color=%23111'}`
  }
  return str
}

const icon = computed(() => {
  if (typeof props.icon === 'string') {
    return {
      dark: getIconUrl(props.icon, 'dark'),
      light: getIconUrl(props.icon, 'light'),
    }
  }
  return {
    dark: getIconUrl(props.icon.dark, 'dark'),
    light: getIconUrl(props.icon.light, 'light'),
  }
})
</script>

<template>
  <VitePlusCore v-if="icon.light === 'builtin:vite-plus-core'" />
  <picture v-else>
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
