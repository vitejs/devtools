<script setup lang="ts">
import BannerRolldownDevTools from '@vitejs/devtools-ui/components/Banner/BannerRolldownDevTools.vue'
import VisualLoading from '@vitejs/devtools-ui/components/Visual/VisualLoading.vue'

defineProps<{
  text?: string
}>()
</script>

<template>
  <VisualLoading :text="text">
    <template #banner>
      <BannerRolldownDevTools />
    </template>
  </VisualLoading>
</template>
