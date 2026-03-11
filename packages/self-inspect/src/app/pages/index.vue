<script setup lang="ts">
import { useRpc } from '#imports'
import { ref } from 'vue'

const rpc = useRpc()

const currentTab = ref<'rpc' | 'docks' | 'scripts' | 'plugins'>('rpc')

const tabs = [
  { label: 'RPC Functions', value: 'rpc' as const, icon: 'i-ph-plugs-connected-duotone' },
  { label: 'Docks', value: 'docks' as const, icon: 'i-ph-layout-duotone' },
  { label: 'Client Scripts', value: 'scripts' as const, icon: 'i-ph-code-duotone' },
  { label: 'DevTools Plugins', value: 'plugins' as const, icon: 'i-ph-puzzle-piece-duotone' },
] as const

const rpcFunctions = await rpc.value.call('devtoolskit:self-inspect:get-rpc-functions')
const docks = await rpc.value.call('devtoolskit:self-inspect:get-docks')
const clientScripts = await rpc.value.call('devtoolskit:self-inspect:get-client-scripts')
const devtoolsPlugins = await rpc.value.call('devtoolskit:self-inspect:get-devtools-plugins')
</script>

<template>
  <div flex="~ col" h-full>
    <div flex="~ row" border="b base" bg-base>
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
        <DisplayNumberBadge
          :value="tab.value === 'rpc' ? rpcFunctions.length
            : tab.value === 'docks' ? docks.length
              : tab.value === 'scripts' ? clientScripts.length
                : devtoolsPlugins.filter(p => p.hasDevtools).length"
        />
      </button>
    </div>
    <div flex-1 of-auto p4>
      <RpcFunctionsList v-if="currentTab === 'rpc'" :functions="rpcFunctions" />
      <DocksList v-else-if="currentTab === 'docks'" :docks="docks" />
      <ClientScriptsList v-else-if="currentTab === 'scripts'" :scripts="clientScripts" />
      <DevtoolsPluginsList v-else-if="currentTab === 'plugins'" :plugins="devtoolsPlugins" />
    </div>
  </div>
</template>
