<script setup lang="ts">
import VisualLoading from '@vitejs/devtools-ui/components/Visual/VisualLoading.vue'
import { ref } from 'vue'

const isLoading = ref(true)
</script>

<template>
  <div class="relative h-full">
    <VisualLoading
      v-if="isLoading"
      class="absolute inset-0"
      text="Loading Oxfmt documentation..."
    />
    <iframe
      src="https://oxc.rs/docs/guide/usage/formatter.html"
      title="Oxfmt Documentation"
      class="border-0 block w-full h-full"
      @load="isLoading = false"
    />
  </div>
</template>
