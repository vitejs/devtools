<script setup lang="ts">
import type { RolldownPluginBuildMetrics, SessionContext } from '~~/shared/types/data'
import { useToggle } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { settings } from '~~/app/state/settings'

defineProps<{
  session: SessionContext
  buildMetrics: RolldownPluginBuildMetrics
}>()

const [expanded, toggleExpanded] = useToggle(true)
const tableFieldFilterRules = [
  {
    match: /hookName/,
    name: 'hookName',
    description: 'Hook name',
    icon: 'i-carbon:function',
  },
  {
    match: /module/,
    name: 'module',
    description: 'Module',
    icon: 'i-ph:package-duotone',
  },
  {
    match: /startTime/,
    name: 'startTime',
    description: 'Start Time',
    icon: 'i-carbon:time',
  },
  {
    match: /endTime/,
    name: 'endTime',
    description: 'End Time',
    icon: 'i-carbon:time',
  },
  {
    match: /duration/,
    name: 'duration',
    description: 'Duration',
    icon: 'i-ph:clock-duotone',
  },
]
const searchValue = ref<{ selected: string[] | null, search: false }>({
  selected: settings.value.pluginDetailsTableFields,
  search: false,
})
const selectedFields = computed(() => settings.value.pluginDetailsTableFields ? settings.value.pluginDetailsTableFields : tableFieldFilterRules.map(rule => rule.name))

watch(() => searchValue.value.selected, (value) => {
  settings.value.pluginDetailsTableFields = value
})
</script>

<template>
  <div p2 h-full w-full>
    <div flex="~" border="~ base" rounded-2 h-full relative of-hidden>
      <div v-if="expanded" of-hidden border="r base">
        <FlowmapPluginFlowTimeline
          :session="session"
          :build-metrics="buildMetrics"
        >
          <template #header>
            <div px2 h10 border="b base" bg-base rounded-t-2 flex="~ items-center justify-end">
              <button w8 h8 rounded-full cursor-pointer hover="bg-active" flex="~ items-center justify-center" @click="toggleExpanded(false)">
                <i i-fluent:panel-right-expand-20-regular inline-flex op50 />
              </button>
            </div>
          </template>
        </FlowmapPluginFlowTimeline>
      </div>
      <div flex-1 of-y-auto h-full flex="~ col">
        <div px2 h10 border="b base" bg-base rounded-t-2 of-x-auto ws-nowrap flex="~ items-center">
          <button v-if="!expanded" w8 h8 rounded-full cursor-pointer mr1 hover="bg-active" flex="~ items-center justify-center" @click="toggleExpanded(true)">
            <i i-fluent:panel-left-expand-20-regular inline-flex op50 />
          </button>
          <DataSearchPanel
            v-model="searchValue"
            h8
            border-none selected-container-class="p0! border-none bg-none flex-nowrap!"
            :rules="tableFieldFilterRules"
            class="[&_[icon-catppuccin]]:(filter-none!)"
          />
        </div>
        <div flex-1 of-y-auto overscroll-contain>
          <DataPluginDetailsTable
            :session="session"
            :build-metrics="buildMetrics"
            :selected-fields="selectedFields"
          />
        </div>
      </div>
    </div>
  </div>
</template>
