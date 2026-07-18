<script setup lang="ts">
import { computed } from 'vue'
import { getFileTypeFromModuleId } from '../../utils/icon'

const props = defineProps<{
  filename: string
}>()

const info = computed(() => getFileTypeFromModuleId(props.filename))
</script>

<template>
  <div
    class="flex-none icon-catppuccin"
    :title="info.description || info.name"
    :class="[info.icon]"
  />
</template>
