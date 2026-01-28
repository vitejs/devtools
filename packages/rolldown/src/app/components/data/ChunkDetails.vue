<script setup lang="ts">
import type { RolldownChunkImport, RolldownChunkInfo, SessionContext } from '~~/shared/types'
import { useRoute } from '#app/composables/router'
import { useRpc } from '#imports'
import { useAsyncState } from '@vueuse/core'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  chunk: RolldownChunkInfo
  session: SessionContext
  showDetails?: boolean
  chunks?: RolldownChunkInfo[]
}>(), {
  showDetails: true,
})

const modulesMap = computed(() => {
  const map = new Map()
  for (const module of props.session.modulesList) {
    map.set(module.id, module)
  }
  return map
})

function getModuleSize(modules: string[]) {
  return modules.reduce((total, id) => {
    const moduleInfo = modulesMap.value.get(id)
    if (!moduleInfo || !moduleInfo.buildMetrics?.transforms?.length)
      return total

    const transforms = moduleInfo.buildMetrics.transforms
    return total + transforms[transforms.length - 1]!.transformed_code_size
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

const imports = computed((): Array<RolldownChunkImport & { size: number }> => {
  return props.chunk.imports.map((importChunk) => {
    const chunk = normalizedChunks.value?.find(c => c.chunk_id === importChunk.chunk_id)
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
  return normalizedChunks.value?.filter(c => c.imports.some(i => i.chunk_id === props.chunk.chunk_id)).map((chunk) => {
    const importChunk = chunk.imports.find(i => i.chunk_id === props.chunk.chunk_id)!

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
