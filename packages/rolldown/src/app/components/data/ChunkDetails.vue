<script setup lang="ts">
import type { ModuleListItem, RolldownChunkImport, RolldownChunkInfo, SessionContext } from '~~/shared/types'
import DisplayBadge from '@vitejs/devtools-ui/components/DisplayBadge.vue'
import { useAsyncState } from '@vueuse/core'
import { computed } from 'vue'
import { useRoute } from '#app/composables/router'
import { useRpc } from '#imports'

type ChunkImportInfo = RolldownChunkInfo['imports'][number]

interface SessionModulesIndex {
  modulesList: ModuleListItem[]
  map: Map<string, ModuleListItem>
}

interface ChunkImporterRef {
  chunk: RolldownChunkInfo
  importChunk: ChunkImportInfo
}

interface ChunksIndex {
  byId: Map<RolldownChunkInfo['chunk_id'], RolldownChunkInfo>
  importersById: Map<RolldownChunkInfo['chunk_id'], ChunkImporterRef[]>
}

const props = withDefaults(defineProps<{
  chunk: RolldownChunkInfo
  session: SessionContext
  showDetails?: boolean
  chunks?: RolldownChunkInfo[]
}>(), {
  showDetails: true,
})

const sessionModulesIndexCache = new Map<string, SessionModulesIndex>()
const chunksIndexCache = new WeakMap<RolldownChunkInfo[], ChunksIndex>()

function getSessionModulesMap(session: SessionContext) {
  const cached = sessionModulesIndexCache.get(session.id)
  if (cached?.modulesList === session.modulesList)
    return cached.map

  const map = new Map<string, ModuleListItem>()
  for (const module of session.modulesList) {
    map.set(module.id, module)
  }
  sessionModulesIndexCache.set(session.id, {
    modulesList: session.modulesList,
    map,
  })
  return map
}

function getChunksIndex(chunks: RolldownChunkInfo[]) {
  const cached = chunksIndexCache.get(chunks)
  if (cached)
    return cached

  const byId = new Map<RolldownChunkInfo['chunk_id'], RolldownChunkInfo>()
  const importersById = new Map<RolldownChunkInfo['chunk_id'], ChunkImporterRef[]>()

  for (const chunk of chunks) {
    byId.set(chunk.chunk_id, chunk)
    for (const importChunk of chunk.imports) {
      const importers = importersById.get(importChunk.chunk_id) ?? []
      importers.push({ chunk, importChunk })
      importersById.set(importChunk.chunk_id, importers)
    }
  }

  const index = {
    byId,
    importersById,
  }
  chunksIndexCache.set(chunks, index)
  return index
}

const modulesMap = computed(() => getSessionModulesMap(props.session))

function getModuleSize(modules: string[]) {
  return modules.reduce((total, id) => {
    const moduleInfo = modulesMap.value.get(id)
    if (!moduleInfo || !moduleInfo.buildMetrics?.transforms?.length)
      return total

    const transforms = moduleInfo.buildMetrics.transforms
    return total + transforms.at(-1)!.transformed_code_size
  }, 0)
}

const chunkSize = computed(() => getModuleSize(props.chunk.modules))

const route = useRoute()
const rpc = useRpc()
const { state, isLoading } = useAsyncState(
  async () => {
    if (props.chunks)
      return

    return await rpc.value.call(
      'vite:rolldown:get-chunks-graph',
      { session: props.session.id },
    )
  },
  null,
)

const normalizedChunks = computed(() => props.chunks || state.value)
const chunksIndex = computed(() => normalizedChunks.value ? getChunksIndex(normalizedChunks.value) : undefined)

const imports = computed((): Array<RolldownChunkImport & { size: number }> => {
  return props.chunk.imports.map((importChunk) => {
    const chunk = chunksIndex.value?.byId.get(importChunk.chunk_id)
    return {
      ...importChunk,
      name: chunk?.name || '[unnamed]',
      reason: chunk?.reason || 'common',
      imports: chunk?.imports.length || 0,
      modules: chunk?.modules.length || 0,
      size: getModuleSize(chunk?.modules || []),
    }
  })
})

const importers = computed((): RolldownChunkImport[] => {
  return chunksIndex.value?.importersById.get(props.chunk.chunk_id)?.map(({ chunk, importChunk }) => {
    return {
      ...importChunk,
      chunk_id: chunk.chunk_id,
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
    <ChunksBaseInfo :chunk="chunk">
      <template #left-after>
        <DisplayBadge v-if="chunk.is_initial" text="initial" />
        <DisplayFileSizeBadge :bytes="chunkSize" text-sm title="Chunk size" />
        <div v-if="imports.length" text-sm op50 flex="~ items-center" title="Total size of imports">
          (<DisplayFileSizeBadge :bytes="imports.reduce((total, i) => total + i.size, 0) " />)
        </div>
      </template>
      <slot />
    </ChunksBaseInfo>

    <template v-if="showDetails">
      <details open="true">
        <summary op50>
          Assets
        </summary>
        <NuxtLink
          border="~ base rounded-lg" px2 mt2 py1 min-w-fit flex="~"
          :to="{ path: route.path, query: { asset: chunk.asset?.filename } }"
        >
          <AssetsBaseInfo :asset="{ ...chunk.asset!, type: 'asset' }" />
        </NuxtLink>
      </details>

      <details open="true">
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

      <template v-else>
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
    </template>
  </div>
</template>
