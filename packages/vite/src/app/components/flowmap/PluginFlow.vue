<script setup lang="ts">
import type { ClientSettings } from '~~/app/state/settings'
import type { RolldownPluginBuildMetrics, SessionContext } from '~~/shared/types/data'
import { useCycleList, useToggle } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { settings } from '~~/app/state/settings'

const props = defineProps<{
  session: SessionContext
  buildMetrics: RolldownPluginBuildMetrics
}>()

const [expanded, toggleExpanded] = useToggle(true)
const tableFieldFilterRules = [
  {
    match: /hookName/,
    name: 'hookName',
    description: 'Hook name',
    icon: 'i-ph-function-duotone',
  },
  {
    match: /module/,
    name: 'module',
    description: 'Module',
    icon: 'i-ph-package-duotone',
  },
  {
    match: /startTime/,
    name: 'startTime',
    description: 'Start Time',
    icon: 'i-ph-clock-duotone',
  },
  {
    match: /endTime/,
    name: 'endTime',
    description: 'End Time',
    icon: 'i-ph-clock-duotone',
  },
  {
    match: /duration/,
    name: 'duration',
    description: 'Duration',
    icon: 'i-ph-clock-countdown-duotone',
  },
]
const searchValue = ref<{ selected: string[] | null, search: false }>({
  selected: settings.value.pluginDetailsTableFields,
  search: false,
})

const selectedFields = computed(() => settings.value.pluginDetailsTableFields ? settings.value.pluginDetailsTableFields : tableFieldFilterRules.map(rule => rule.name))
const { state: showTypeState, next: _toggleShowType } = useCycleList<ClientSettings['pluginDetailsShowType']>(['changed', 'unchanged', 'all'], {
  initialValue: settings.value.pluginDetailsShowType,
})
const showTypeText = computed(() => {
  if (showTypeState.value === 'all')
    return 'Show Changed'
  if (showTypeState.value === 'changed')
    return 'Show Unchanged'
  return 'Show All'
})
const showUnchangedInfo = computed(() => {
  if (!['load', 'transform'].includes(settings.value.pluginDetailSelectedHook))
    return false

  if (!props.buildMetrics.calls?.filter(i => i.type === settings.value.pluginDetailSelectedHook).filter(i => i.unchanged).length)
    return false
  return true
})
const unchangedInfo = computed(() => {
  const unchanged = props.buildMetrics.calls?.filter(i => i.type === settings.value.pluginDetailSelectedHook).filter(i => i.unchanged)
  const unchangedDuration = unchanged.reduce((acc, i) => acc + i.duration, 0)
  return {
    count: unchanged.length,
    duration: unchangedDuration,
  }
})

watch(() => searchValue.value.selected, (value) => {
  settings.value.pluginDetailsTableFields = value
})

function toggleShowType() {
  _toggleShowType()
  settings.value.pluginDetailsShowType = showTypeState.value
}
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
        <div flex="~ items-center justify-between" border="b base" px2 h10 bg-base rounded-t-2 of-x-auto ws-nowrap>
          <div flex="~ items-center" h-full>
            <button v-if="!expanded" w8 h8 rounded-full cursor-pointer mr1 hover="bg-active" flex="~ items-center justify-center" @click="toggleExpanded(true)">
              <i i-fluent:panel-left-expand-20-regular inline-flex op50 />
            </button>
            <DataSearchPanel
              v-model="searchValue"
              h-full border-none selected-container-class="px0! py1 border-none bg-none flex-nowrap! h-full"
              :rules="tableFieldFilterRules"
              class="[&_[icon-catppuccin]]:(filter-none!)"
            />
          </div>
          <div v-if="showUnchangedInfo" flex="~ items-center justify-center gap1" h-full text-xs py1>
            <p class="op50" flex="~ items-center gap-1">
              <DisplayNumberBadge :number="unchangedInfo.count" /> module unchanged, but cost <DisplayDuration :duration="unchangedInfo.duration" />
            </p>
            <button rounded-md px2 py1 select-none h-full border="~ base rounded-lg" hover="bg-active" :title="showTypeText" @click="toggleShowType">
              <div class="text-xs op50">
                {{ showTypeText }}
              </div>
            </button>
          </div>
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
