<script setup lang="ts">
import type { Chunk as ChunkInfo } from '@rolldown/debug'
import type { RolldownChunkImport, SessionContext } from '~~/shared/types'
import { useRpc } from '#imports'
import { useAsyncState } from '@vueuse/core'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  chunk: ChunkInfo
  session: SessionContext
  showModules?: boolean
  showImports?: boolean
  chunks?: ChunkInfo[]
}>(), {
  showModules: true,
  showImports: true,
})

const modulesMap = computed(() => {
  const map = new Map()
  for (const module of props.session.modulesList) {
    map.set(module.id, module)
  }
  return map
})

const chunkSize = computed(() => props.chunk.modules.reduce((total, moduleId) => {
  const moduleInfo = modulesMap.value.get(moduleId)
  const transforms = moduleInfo?.buildMetrics?.transforms
  return transforms?.length ? total + transforms[transforms.length - 1]!.transformed_code_size : total
}, 0))

const rpc = useRpc()
const { state, isLoading } = useAsyncState(
  async () => {
    if (props.chunks)
      return

    return await rpc.value!['vite:rolldown:get-chunks-graph']?.({
      session: props.session.id,
    })
  },
  null,
)

const normalizedChunks = computed(() => props.chunks || state.value)

const imports = computed((): RolldownChunkImport[] => {
  return props.chunk.imports.map((importChunk) => {
    const chunk = normalizedChunks.value?.find(c => c.chunk_id === importChunk.chunk_id)

    return {
      ...importChunk,
      name: chunk?.name || '[unnamed]',
      reason: chunk?.reason || 'common',
      imports: chunk?.imports.length || 0,
      modules: chunk?.modules.length || 0,
    }
  })
})

const importers = computed((): RolldownChunkImport[] => {
  return normalizedChunks.value?.filter(c => c.imports.some(i => i.chunk_id === props.chunk.chunk_id)).map((chunk) => {
    const importChunk = chunk.imports.find(i => i.chunk_id === props.chunk.chunk_id)!

    return {
      ...importChunk,
      name: chunk.name || '[unnamed]',
      reason: chunk.reason || 'common',
      imports: chunk.imports.length || 0,
      modules: chunk.modules.length || 0,
    }
  }) || []
})
</script>

<template>
  <div flex="~ col gap-3">
    <div flex="~ gap-3 items-center">
      <div flex="~ gap-2 items-center" :title="`Chunk #${chunk.chunk_id}`">
        <div i-ph-shapes-duotone />
        <div>{{ chunk.name || '[unnamed]' }}</div>
        <DisplayBadge :text="chunk.reason" />
        <DisplayFileSizeBadge :bytes="chunkSize" text-sm />
      </div>

      <div flex-auto />

      <span op50 font-mono>#{{ chunk.chunk_id }}</span>
      <div flex="~ gap-1 items-center">
        <div i-ph-file-arrow-up-duotone />
        {{ chunk.imports.length }}
      </div>
      <div flex="~ gap-1 items-center">
        <div i-ph-package-duotone />
        {{ chunk.modules.length }}
      </div>
      <slot />
    </div>

    <details v-if="showModules" open="true">
      <summary op50>
        <span>Modules ({{ chunk.modules.length }})</span>
      </summary>
      <DisplayExpandableContainer flex="~ col gap-1" mt2 ws-nowrap :list="chunk.modules">
        <template #default="{ items }">
          <DisplayModuleId
            v-for="module of items"
            :id="module"
            :key="module"
            :session
            :link="true"
            :minimal="true"
            hover="bg-active"
            border="~ base rounded" px2 py1 w-full
          />
        </template>
      </DisplayExpandableContainer>
    </details>

    <VisualLoading v-if="isLoading" />

    <template v-else-if="showImports">
      <details v-if="chunk.imports.length" open="true">
        <summary op50>
          <span>Imports ({{ chunk.imports.length }})</span>
        </summary>
        <ChunksImports :imports="imports" />
      </details>

      <details v-if="importers.length" open="true">
        <summary op50>
          <span>Importers ({{ importers.length }})</span>
        </summary>
        <ChunksImports :imports="importers" />
      </details>
    </template>
  </div>
</template>
