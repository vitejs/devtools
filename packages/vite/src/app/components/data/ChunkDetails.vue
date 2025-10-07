<script setup lang="ts">
import type { Chunk as ChunkInfo } from '@rolldown/debug'
import type { SessionContext } from '~~/shared/types'

withDefaults(defineProps<{
  chunk: ChunkInfo
  session: SessionContext
  showModules?: boolean
  showImports?: boolean
}>(), {
  showModules: true,
  showImports: true,
})
</script>

<template>
  <div flex="~ col gap-3">
    <div flex="~ gap-3 items-center">
      <div flex="~ gap-2 items-center" :title="`Chunk #${chunk.chunk_id}`">
        <div i-ph-shapes-duotone />
        <div>{{ chunk.name || '[unnamed]' }}</div>
        <DisplayBadge :text="chunk.reason" />
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

    <details v-if="showImports && chunk.imports.length > 0" open="true">
      <summary op50>
        <span>Imports ({{ chunk.imports.length }})</span>
      </summary>
      <div flex="~ col gap-1" mt2 ws-nowrap>
        <DisplayChunkImports
          v-for="(importChunk, index) in chunk.imports"
          :key="index"
          :chunk-import="importChunk"
          :session="session"
          :importer="chunk"
          hover="bg-active"
          border="~ base rounded" px2 py1 w-full
        />
      </div>
    </details>
  </div>
</template>
