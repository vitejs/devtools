<script setup lang="ts">
import type { Chunk as ChunkInfo } from '@rolldown/debug'
import type { RolldownChunkImport, SessionContext } from '~~/shared/types'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  chunk: ChunkInfo
  session: SessionContext
  showModules?: boolean
  showImports?: boolean | RolldownChunkImport[]
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

const imports = computed(() => {
  return [] as any[]
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
      <div flex="~ col gap-1" mt2 ws-nowrap>
        <DisplayModuleId
          v-for="module of chunk.modules"
          :id="module"
          :key="module"
          :session
          :link="true"
          :minimal="true"
          hover="bg-active"
          border="~ base rounded" px2 py1 w-full
        />
      </div>
    </details>

    <!-- TODO: imports seems to be "imported-by" instead of "imports", maybe something wrong on Rolldown side? -->
    <!-- TODO: We might want to display both "imports" and "imported-by" relationship -->
    <details v-if="showImports && chunk.imports.length > 0" open="true">
      <summary op50>
        <span>Imports ({{ chunk.imports.length }})</span>
      </summary>
      <div flex="~ col gap-1" mt2 ws-nowrap>
        <DisplayChunkImports
          v-for="chunk in imports"
          :key="chunk.chunk_id"
          :chunk="chunk"
          hover="bg-active"
          border="~ base rounded" px2 py1 w-full
        />
      </div>
    </details>
  </div>
</template>
