<script setup lang="ts">
import BannerViteDevTools from '@vitejs/devtools-ui/components/Banner/BannerViteDevTools.vue'
import VisualLoading from '@vitejs/devtools-ui/components/Visual/VisualLoading.vue'

defineProps<{
  text?: string
}>()
</script>

<template>
  <VisualLoading :text="text">
    <template #banner>
      <BannerViteDevTools />
    </template>
  </VisualLoading>
</template>
