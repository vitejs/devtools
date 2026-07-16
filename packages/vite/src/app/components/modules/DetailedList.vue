<script setup lang="ts">
import type { ViteModuleBuildMetrics, ViteModuleListItem, ViteModuleTransformMetric } from '~/types/modules'
import DataVirtualList from '@vitejs/devtools-ui/components/Data/DataVirtualList.vue'
import DisplayPluginName from '@vitejs/devtools-ui/components/Display/DisplayPluginName.vue'

withDefaults(defineProps<{
  root: string
  modules: ViteModuleListItem[]
  itemSize?: number
  minItemSize?: number
  pageMode?: boolean
  scroller?: 'dynamic' | 'window'
}>(), {
  minItemSize: 64,
  pageMode: true,
  scroller: 'dynamic',
})

const filteredTransformsCache = new WeakMap<ViteModuleListItem, ViteModuleTransformMetric[]>()

function getFilteredTransforms(mod: ViteModuleListItem): ViteModuleTransformMetric[] {
  const cached = filteredTransformsCache.get(mod)
  if (cached)
    return cached

  const transforms = mod.buildMetrics?.transforms.filter(i => i.source_code_size !== i.transformed_code_size && i.transformed_code_size) ?? []
  filteredTransformsCache.set(mod, transforms)
  return transforms
}

function isLastFilteredTransform(mod: ViteModuleListItem, index: number) {
  return index === getFilteredTransforms(mod).length - 1
}

function hasBuildMetrics(metrics: ViteModuleBuildMetrics | undefined): metrics is ViteModuleBuildMetrics {
  return !!metrics
}
</script>

<template>
  <div flex="~ col gap-2" p4>
    <DataVirtualList
      :items="modules"
      key-prop="id"
      :item-size="itemSize"
      :min-item-size="minItemSize"
      :page-mode="pageMode"
      :scroller="scroller"
    >
      <template #default="{ item }">
        <div flex pb2>
          <DisplayModuleId
            :id="item.id"
            :cwd="root"
            hover="bg-active" block px2 p1 w-full
            border="~ base rounded"
            :link="true"
          >
            <template #detail>
              <div flex="~ gap-1 wrap" text-xs>
                <ul flex="~ auto text-xs wrap">
                  <template v-for="(p, i) of getFilteredTransforms(item)" :key="i">
                    <li flex="~ items-center">
                      <DisplayPluginName
                        :name="p.plugin_name"
                        class="font-mono ws-nowrap op-50"
                      />
                      <span v-if="!isLastFilteredTransform(item, i)" op20>|</span>
                    </li>
                  </template>
                </ul>

                <div flex="~ auto gap-1" of-hidden />
                <div flex="~ none gap-1 wrap justify-end">
                  <span>
                    <ModulesBuildMetrics v-if="hasBuildMetrics(item.buildMetrics)" :metrics="item.buildMetrics" />
                  </span>
                </div>
              </div>
            </template>
          </DisplayModuleId>
        </div>
      </template>
    </DataVirtualList>
  </div>
</template>
