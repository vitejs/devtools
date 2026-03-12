<script setup lang="ts">
import { useHead } from '#app/composables/head'
import PanelSideNav from '@vitejs/devtools-ui/components/PanelSideNav.vue'
import { useSideNav } from '@vitejs/devtools-ui/composables/nav'
import { useRefresh } from './composables/refresh'
import { connect, connectionState } from './composables/rpc'
import './styles/global.css'
import './composables/dark'

useHead({
  title: 'DevTools Self Inspect',
})

connect()

useSideNav([
  {
    title: 'RPC Functions',
    to: '/rpc',
    icon: 'i-ph-plugs-connected-duotone',
  },
  {
    title: 'Docks',
    to: '/docks',
    icon: 'i-ph-layout-duotone',
  },
  {
    title: 'Client Scripts',
    to: '/scripts',
    icon: 'i-ph-code-duotone',
  },
  {
    title: 'DevTools Plugins',
    to: '/plugins',
    icon: 'i-ph-puzzle-piece-duotone',
  },
])

const { refresh, loading } = useRefresh()
</script>

<template>
  <div v-if="connectionState.error" text-red p4>
    {{ connectionState.error }}
  </div>
  <VisualLoading
    v-else-if="!connectionState.connected"
    text="Connecting..."
  />
  <div v-else grid="~ cols-[max-content_1fr]" h-vh>
    <PanelSideNav :show-dark-mode-toggle="false" />
    <div flex="~ col" of-hidden>
      <div flex="~ items-center justify-end" border="b base" px2 h8 shrink-0>
        <button
          p1.5 rounded
          hover:bg-active
          op50 hover:op100
          transition-colors
          title="Refresh"
          :disabled="loading"
          @click="refresh"
        >
          <span i-ph-arrow-clockwise text-sm :class="loading ? 'animate-spin' : ''" />
        </button>
      </div>
      <div flex-1 of-auto>
        <NuxtPage />
      </div>
    </div>
  </div>
</template>
