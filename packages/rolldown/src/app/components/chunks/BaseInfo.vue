<script setup lang="ts">
import type { RolldownChunkImport, RolldownChunkInfo } from '~~/shared/types/data'
import { useRoute } from '#app/composables/router'
import { NuxtLink } from '#components'
import DisplayBadge from '@vitejs/devtools-ui/components/DisplayBadge.vue'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  chunk: RolldownChunkInfo | RolldownChunkImport
  link?: boolean
  basic?: boolean
}>(), {
  link: false,
  basic: false,
})
const route = useRoute()
const normalizedImports = computed(() => Array.isArray(props.chunk.imports) ? props.chunk.imports.length : props.chunk.imports)
const normalizedModules = computed(() => Array.isArray(props.chunk.modules) ? props.chunk.modules.length : props.chunk.modules)
</script>

<template>
  <component
    :is="link ? NuxtLink : 'div'"
    :to="link ? (typeof link === 'string' ? link : { path: route.path, query: { chunk: chunk.chunk_id } }) : undefined"
    flex="~ gap-3 items-center"
  >
    <div flex="~ gap-2 items-center" :title="`Chunk #${chunk.chunk_id}`">
      <slot name="icon">
        <div i-ph-shapes-duotone />
      </slot>
      <div>{{ chunk.name || '[unnamed]' }}</div>
      <DisplayBadge :text="chunk.reason" />
      <slot name="left-after" />
    </div>

    <div flex-auto />

    <div v-if="!basic" flex="~ items-center gap-2">
      <span op50 font-mono>#{{ chunk.chunk_id }}</span>
      <div flex="~ gap-1 items-center" :title="`${normalizedImports} imports`">
        <div i-ph-file-arrow-up-duotone />
        {{ normalizedImports }}
      </div>
      <div flex="~ gap-1 items-center" :title="`${normalizedModules} modules`">
        <div i-ph-package-duotone />
        {{ normalizedModules }}
      </div>
    </div>
    <slot />
  </component>
</template>
