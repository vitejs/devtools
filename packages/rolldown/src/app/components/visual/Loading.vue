<script setup lang="ts">
import BannerRolldownDevTools from '@vitejs/devtools-ui/components/banners/BannerRolldownDevTools.vue'

const props = defineProps<{
  text?: string
}>()
</script>

<template>
  <div p10 h-full flex="~ col" items-center justify-center>
    <BannerRolldownDevTools />
    <div flex="~ gap-2" animate-pulse items-center justify-center>
      <div i-svg-spinners-8-dots-rotate />
      <span>{{ props.text ?? 'Loading...' }}</span>
    </div>
  </div>
</template>
