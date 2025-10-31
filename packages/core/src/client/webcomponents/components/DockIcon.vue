<script setup lang="ts">
defineProps<{
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
</script>

<template>
  <img
    :src="getIconUrl(icon, 'dark')"
    :alt="title"
    draggable="false"
  >
</template>
