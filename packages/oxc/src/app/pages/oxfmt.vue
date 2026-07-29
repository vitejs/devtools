<script setup lang="ts">
import PanelSideNav from '@vitejs/devtools-ui/components/Panel/PanelSideNav.vue'
import { useSideNav } from '@vitejs/devtools-ui/composables/nav'

useSideNav(() => [
  {
    title: 'Home',
    icon: 'i-ph-house-duotone',
    to: '/',
  },
  {
    title: 'Config Inspector',
    icon: 'i-ph-sliders-duotone',
    to: '/oxfmt/config',
  },
  {
    title: 'Documents',
    icon: 'i-ph-book-open-duotone',
    to: '/oxfmt/documents',
  },
])
</script>

<template>
  <div
    class="grid grid-cols-[max-content_1fr] h-screen w-screen max-w-screen max-h-screen of-hidden"
  >
    <PanelSideNav />
    <div class="of-auto h-screen max-h-screen relative">
      <NuxtPage />
    </div>
  </div>
</template>
