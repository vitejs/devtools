<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { getIconifySvg } from '../utils/iconify'

const props = defineProps<{
  icon: string
}>()

const isUrlIcon = computed(() => props.icon.includes('/') || props.icon.startsWith('data:') || props.icon.startsWith('builtin:'))
const iconifyParsed = computed(() => {
  if (isUrlIcon.value)
    return undefined
  const match = props.icon.match(/^([\w-]+):([\w-]+)$/)
  if (!match)
    return undefined
  return {
    collection: match[1]!,
    icon: match[2]!,
  }
})

const iconifyLoaded = ref<string | undefined>(undefined)
watchEffect(async () => {
  if (!iconifyParsed.value) {
    iconifyLoaded.value = undefined
    return
  }
  iconifyLoaded.value = await getIconifySvg(iconifyParsed.value.collection, iconifyParsed.value.icon)
})
</script>

<template>
  <div
    v-if="iconifyParsed"
    v-html="iconifyLoaded"
  />
  <img
    v-else :src="icon"
    class="w-full h-full m-auto"
    draggable="false"
  >
</template>
