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
    <DataVirtualList
      :items="plugins"
      key-prop="plugin_id"
    >
      <template #default="{ item }">
        <div flex pb2>
          <NuxtLink :to="{ path: route.path, query: { plugin: item.plugin_id } }" font-mono border="~ rounded base" w-full px2 py1 text-sm hover="bg-active" flex="~ gap-4 items-center">
            <div w-8 text-right text-xs op50>
              #{{ item.plugin_id }}
            </div>
            <span overflow-hidden text-ellipsis break-all line-clamp-2>
              <DisplayPluginName :name="item.name" />
            </span>
          </NuxtLink>
        </div>
      </template>
    </DataVirtualList>
  </div>
</template>
