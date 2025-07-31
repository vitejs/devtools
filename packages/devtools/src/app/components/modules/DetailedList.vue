<script setup lang="ts">
import type { ModuleListItem, SessionContext } from '~~/shared/types'
import { computed } from 'vue'

const props = defineProps<{
  session: SessionContext
  modules: ModuleListItem[]
}>()

const filteredTransformsMap = computed(() => {
  const map = new Map<string, Exclude<ModuleListItem['buildMetrics'], undefined>['transforms']>()
  for (const mod of props.modules) {
    const t = mod.buildMetrics?.transforms.filter(i => i.source_code_size !== i.transformed_code_size).filter(i => i.transformed_code_size)
    map.set(mod.id, t!)
  }
  return map
})
</script>

<template>
  <div flex="~ col gap-2" p4>
    <template v-for="mod of modules" :key="mod">
      <div>
        <DisplayModuleId
          :id="mod.id"
          :session
          hover="bg-active" block px2 p1
          border="~ base rounded"
          :link="true"
        >
          <template #detail>
            <div flex="~ gap-1 wrap" text-xs>
              <ul flex="~ auto text-xs wrap">
                <template v-for="(p, i) of filteredTransformsMap.get(mod.id)" :key="i">
                  <li v-if="p.source_code_size !== p.transformed_code_size && p.transformed_code_size" flex="~ items-center">
                    <DisplayPluginName
                      :name="p.plugin_name"
                      class="font-mono ws-nowrap op-50"
                    />
                    <span v-if="i !== filteredTransformsMap.get(mod.id)!.length - 1" op20>|</span>
                  </li>
                </template>
              </ul>

              <div flex="~ auto gap-1" of-hidden />
              <div flex="~ none gap-1 wrap justify-end">
                <span>
                  <ModulesBuildMetrics v-if="mod.buildMetrics" :metrics="mod.buildMetrics" />
                </span>
              </div>
            </div>
          </template>
        </DisplayModuleId>
      </div>
    </template>
  </div>
</template>
