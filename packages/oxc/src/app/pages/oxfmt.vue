<script setup lang="ts">
import PanelSideNav from '@vitejs/devtools-ui/components/Panel/PanelSideNav.vue'
import { useSideNav } from '@vitejs/devtools-ui/composables/nav'
import { useAsyncState } from '@vueuse/core'
import { createOverview } from '../utils/overview'
import { useRpc } from '#imports'

const rpc = useRpc()
const { state: overview } = useAsyncState(
  () => rpc.value.call('devtools-oxc:overview'),
  createOverview(),
)

useSideNav(() => [
  {
    title: 'Home',
    icon: 'i-ph-house-duotone',
    to: '/',
  },
  // {
  //   title: 'Config Inspector',
  //   icon: 'i-ph-sliders-duotone',
  //   to: '/oxfmt/config',
  // },
  ...(overview.value.oxfmt.installed
    ? [
        {
          title: 'Format Inspector',
          icon: 'i-ph-magnifying-glass-duotone',
          to: '/oxfmt/format',
        },
      ]
    : []),
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
