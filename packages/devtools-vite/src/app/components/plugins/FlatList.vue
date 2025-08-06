<script setup lang="ts">
import type { PluginItem } from '~~/shared/types'
import { useRoute } from '#app/composables/router'

defineProps<{
  plugins: PluginItem[]
}>()

const route = useRoute()
</script>

<template>
  <div flex="~ col gap-2" p4>
    <template v-for="plugin of plugins" :key="plugin.id">
      <NuxtLink :to="{ path: route.path, query: { plugin: plugin.plugin_id } }" font-mono border="~ rounded base" px2 py1 text-sm hover="bg-active" flex="~ gap-4 items-center">
        <div w-8 text-right text-xs op50>
          #{{ plugin.plugin_id }}
        </div>
        <span overflow-hidden text-ellipsis break-all line-clamp-2>
          <DisplayPluginName :name="plugin.name" />
        </span>
      </NuxtLink>
    </template>
  </div>
</template>
