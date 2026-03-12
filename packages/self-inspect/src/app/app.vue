<script setup lang="ts">
import { useHead } from '#app/composables/head'
import { toggleDark } from '@vitejs/devtools-ui/composables/dark'
import { useRefresh } from './composables/refresh'
import { connect, connectionState } from './composables/rpc'
import './styles/global.css'

useHead({
  title: 'DevTools Self Inspect',
})

connect()

const navItems = [
  { title: 'RPC Functions', to: '/rpc', icon: 'i-ph-plugs-connected-duotone' },
  { title: 'Docks', to: '/docks', icon: 'i-ph-layout-duotone' },
  { title: 'Client Scripts', to: '/scripts', icon: 'i-ph-code-duotone' },
  { title: 'Plugins', to: '/plugins', icon: 'i-ph-puzzle-piece-duotone' },
]

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
  <div v-else h-vh flex="~ col" of-hidden>
    <div flex="~ items-center" border="b base" h9 shrink-0>
      <NuxtLink
        v-for="item in navItems" :key="item.to"
        :to="item.to"
        flex="~ items-center gap-1.5"
        px3 h-full text-sm
        op50 hover:op100 transition-colors
        border="b-2 transparent"
        active-class="op100! border-b-primary!"
      >
        <span :class="item.icon" text-base />
        <span>{{ item.title }}</span>
      </NuxtLink>
      <div flex-1 />
      <button
        mr2 p1.5 rounded
        hover:bg-active
        op50 hover:op100
        transition-colors
        title="Refresh"
        :disabled="loading"
        @click="refresh"
      >
        <span i-ph-arrow-clockwise text-sm :class="loading ? 'animate-spin' : ''" />
      </button>
      <button
        mr2 p1.5 rounded
        hover:bg-active
        op50 hover:op100
        transition-colors
        title="Toggle dark mode"
        @click="toggleDark"
      >
        <span class="i-ph-sun-duotone dark:i-ph-moon-duotone" text-sm />
      </button>
    </div>
    <div flex-1 of-auto>
      <NuxtPage />
    </div>
  </div>
</template>
