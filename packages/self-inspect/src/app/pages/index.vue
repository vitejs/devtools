<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { ClientScriptInfo, DevtoolsPluginInfo } from '~~/types'
import { useRpc } from '#imports'
import { ref, shallowRef, watch } from 'vue'

const rpc = useRpc()

const currentTab = ref<'rpc' | 'docks' | 'scripts' | 'plugins'>('rpc')

const tabs = [
  { label: 'RPC Functions', value: 'rpc' as const, icon: 'i-ph-plugs-connected-duotone' },
  { label: 'Docks', value: 'docks' as const, icon: 'i-ph-layout-duotone' },
  { label: 'Client Scripts', value: 'scripts' as const, icon: 'i-ph-code-duotone' },
  { label: 'DevTools Plugins', value: 'plugins' as const, icon: 'i-ph-puzzle-piece-duotone' },
] as const

interface RpcFunctionInfo {
  name: string
  type: string
  cacheable: boolean
  hasArgs: boolean
  hasReturns: boolean
  hasDump: boolean
  hasSetup: boolean
  hasHandler: boolean
}

const rpcFunctions = shallowRef<RpcFunctionInfo[]>()
const docks = shallowRef<DevToolsDockEntry[]>()
const clientScripts = shallowRef<ClientScriptInfo[]>()
const devtoolsPlugins = shallowRef<DevtoolsPluginInfo[]>()

const loading = ref(false)

async function fetchCurrentTab() {
  loading.value = true
  try {
    switch (currentTab.value) {
      case 'rpc':
        rpcFunctions.value = await rpc.value.call('devtoolskit:self-inspect:get-rpc-functions')
        break
      case 'docks':
        docks.value = await rpc.value.call('devtoolskit:self-inspect:get-docks')
        break
      case 'scripts':
        clientScripts.value = await rpc.value.call('devtoolskit:self-inspect:get-client-scripts')
        break
      case 'plugins':
        devtoolsPlugins.value = await rpc.value.call('devtoolskit:self-inspect:get-devtools-plugins')
        break
    }
  }
  finally {
    loading.value = false
  }
}

watch(currentTab, () => fetchCurrentTab(), { immediate: true })
</script>

<template>
  <div flex="~ col" h-full>
    <div flex="~ row items-center" border="b base" bg-base>
      <button
        v-for="tab in tabs"
        :key="tab.value"
        flex="~ items-center gap-1.5"
        px3 py2 text-sm
        border="b-2 transparent"
        transition-colors
        :class="currentTab === tab.value ? 'border-b-primary! text-primary font-medium' : 'op60 hover:op80'"
        @click="currentTab = tab.value"
      >
        <span :class="tab.icon" />
        {{ tab.label }}
      </button>
      <div flex-1 />
      <button
        mr2 p1.5 rounded
        hover:bg-active
        op50 hover:op100
        transition-colors
        title="Refresh"
        :disabled="loading"
        @click="fetchCurrentTab"
      >
        <span i-ph-arrow-clockwise :class="loading ? 'animate-spin' : ''" />
      </button>
    </div>
    <div flex-1 of-auto p4>
      <div v-if="loading && !rpcFunctions && !docks && !clientScripts && !devtoolsPlugins" flex="~ items-center justify-center" h-full op50>
        Loading...
      </div>
      <RpcFunctionsList v-else-if="currentTab === 'rpc' && rpcFunctions" :functions="rpcFunctions" />
      <DocksList v-else-if="currentTab === 'docks' && docks" :docks="docks" />
      <ClientScriptsList v-else-if="currentTab === 'scripts' && clientScripts" :scripts="clientScripts" />
      <DevtoolsPluginsList v-else-if="currentTab === 'plugins' && devtoolsPlugins" :plugins="devtoolsPlugins" />
    </div>
  </div>
</template>
