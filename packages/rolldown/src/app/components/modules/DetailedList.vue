<script setup lang="ts">
import type { ModuleListItem, SessionContext } from '~~/shared/types'
import DataVirtualList from '@vitejs/devtools-ui/components/Data/DataVirtualList.vue'
import DisplayPluginName from '@vitejs/devtools-ui/components/Display/DisplayPluginName.vue'

withDefaults(defineProps<{
  session: SessionContext
  modules: ModuleListItem[]
  itemSize?: number
  minItemSize?: number
  pageMode?: boolean
  scroller?: 'dynamic' | 'window'
}>(), {
  minItemSize: 64,
  pageMode: true,
  scroller: 'dynamic',
})

type ModuleTransforms = Exclude<ModuleListItem['buildMetrics'], undefined>['transforms']

const filteredTransformsCache = new WeakMap<ModuleListItem, ModuleTransforms>()

function getFilteredTransforms(mod: ModuleListItem): ModuleTransforms {
  const cached = filteredTransformsCache.get(mod)
  if (cached)
    return cached

  const transforms = mod.buildMetrics?.transforms.filter(i => i.source_code_size !== i.transformed_code_size && i.transformed_code_size) ?? []
  filteredTransformsCache.set(mod, transforms)
  return transforms
}

function isLastFilteredTransform(mod: ModuleListItem, index: number) {
  return index === getFilteredTransforms(mod).length - 1
}
</script>

<template>
  <div class="flex flex-col gap-2 p4">
    <DataVirtualList
      :items="modules"
      key-prop="id"
      :item-size="itemSize"
      :min-item-size="minItemSize"
      :page-mode="pageMode"
      :scroller="scroller"
    >
      <template #default="{ item }">
        <div class="flex pb2">
          <DisplayModuleId
            :id="item.id"
            :session
            class="hover:bg-active block px2 p1 w-full border border-base rounded"
            :link="true"
          >
            <template #detail>
              <div class="flex gap-1 flex-wrap text-xs">
                <ul class="flex flex-auto flex-wrap">
                  <template v-for="(p, i) of getFilteredTransforms(item)" :key="i">
                    <li class="flex items-center">
                      <DisplayPluginName
                        :name="p.plugin_name"
                        class="font-mono ws-nowrap op-50"
                      />
                      <span v-if="!isLastFilteredTransform(item, i)" class="op20">|</span>
                    </li>
                  </template>
                </ul>

                <div class="flex flex-auto gap-1 of-hidden" />
                <div class="flex flex-none gap-1 flex-wrap justify-end">
                  <span>
                    <ModulesBuildMetrics v-if="item.buildMetrics" :metrics="item.buildMetrics" />
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
