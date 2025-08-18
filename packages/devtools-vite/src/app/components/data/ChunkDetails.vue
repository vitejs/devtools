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
        <div i-carbon-document-import />
        {{ chunk.imports.length }}
      </div>
      <div flex="~ gap-1 items-center">
        <div i-ph-package-duotone />
        {{ chunk.modules.length }}
      </div>
    </div>

    <template v-if="showImports && chunk.imports.length > 0">
      <div op50>
        Imports
      </div>
      <div flex="~ col gap-1" ws-nowrap>
        <DisplayChunkImports
          v-for="(importChunk, index) in chunk.imports"
          :key="index"
          :chunk-import="importChunk"
          :session="session"
          hover="bg-active"
          border="~ base rounded" px2 py1 w-full
        />
      </div>
    </template>

    <template v-if="showModules">
      <div op50>
        Modules
      </div>
      <div flex="~ col gap-1" ws-nowrap>
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
    </template>
  </div>
</template>
