<script setup lang="ts">
import { useRpc } from '#imports'
import { useAsyncState } from '@vueuse/core'
import { computed } from 'vue'

const rpc = useRpc()
const { state, isLoading } = useAsyncState(
  async () => {
    const [metadata, envInfo] = await Promise.all([
      rpc.value.call(
        'vite:meta-info',
      ),
      rpc.value.call(
        'vite:env-info',
      ),
    ])

    return {
      metadata,
      envInfo,
    }
  },
  null,
)

const projectMetadata = computed(() => state.value?.metadata)
const environmentMetadata = computed(() => state.value?.envInfo)

const metadata = computed(() => [
  {
    id: 'project',
    icon: 'i-material-icon-theme:vite',
    rows: [
      {
        id: 'root',
        icon: 'i-ph-folder-duotone',
        label: 'Root',
        value: projectMetadata.value?.root,
      },
      {
        id: 'base',
        icon: 'i-ph-folder-duotone',
        label: 'Base',
        value: projectMetadata.value?.base,
      },
      {
        id: 'plugins',
        icon: 'i-ph-plugs-duotone',
        label: 'Plugins',
        value: projectMetadata.value?.plugins.length ?? 0,
      },
    ],
  },
  {
    id: 'system',
    icon: 'i-ph:desktop',
    rows: [
      {
        id: 'os',
        icon: 'i-ph-folder-duotone',
        label: 'OS',
        value: environmentMetadata.value?.os,
      },
      {
        id: 'cpu',
        icon: 'i-ph:cpu',
        label: 'CPU',
        value: environmentMetadata.value?.cpu,
      },
      {
        id: 'memory',
        icon: 'i-ph:memory',
        label: 'Memory',
        value: environmentMetadata.value?.memory,
      },
    ],
  },
  {
    id: 'runtime',
    icon: 'i-system-uicons:version',
    rows: [
      {
        id: 'node',
        icon: 'i-ri:nodejs-fill',
        label: 'Node',
        value: environmentMetadata.value?.node,
      },
      {
        id: 'bun',
        icon: 'i-catppuccin:bun',
        label: 'Bun',
        value: environmentMetadata.value?.bun,
      },
      {
        id: 'npm',
        icon: 'i-ri:npmjs-fill',
        label: 'NPM',
        value: environmentMetadata.value?.npm,
      },
      {
        id: 'pnpm',
        icon: 'i-catppuccin:pnpm',
        label: 'PNPM',
        value: environmentMetadata.value?.pnpm,
      },
      {
        id: 'yarn',
        icon: 'i-catppuccin:yarn',
        label: 'Yarn',
        value: environmentMetadata.value?.yarn,
      },
    ],
  },
])
</script>

<template>
  <VisualLoading
    v-if="isLoading"
    text="Connecting..."
  />
  <div v-else p4 flex="~ col gap-4" items-center justify-center relative>
    <VisualLogoBanner />

    <div border="~ base rounded" p2 flex="~ col gap-4 justify-center">
      <div
        v-for="section in metadata"
        :key="section.id"
        p4
        flex="~ gap-14 items-center"
      >
        <div class="text-3xl flex ml3" :class="section.icon" />
        <div>
          <div
            v-for="row in section.rows"
            :key="row.id"
            grid="~ cols-[max-content_80px_2fr] gap-2 items-center"
          >
            <div :class="row.icon" />
            <div>
              {{ row.label }}
            </div>
            <div font-mono truncate>
              {{ row.value }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
