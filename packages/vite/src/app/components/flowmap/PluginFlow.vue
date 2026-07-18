<script setup lang="ts">
import type { ClientSettings } from '~/state/settings'
import type { ViteModuleListItem } from '~/types/modules'
import type { VitePluginDetails } from '~/types/plugins'
import DataSearchPanel from '@vitejs/devtools-ui/components/Data/DataSearchPanel.vue'
import DisplayDuration from '@vitejs/devtools-ui/components/Display/DisplayDuration.vue'
import DisplayNumberBadge from '@vitejs/devtools-ui/components/Display/DisplayNumberBadge.vue'
import { useCycleList, useToggle } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { settings } from '~/state/settings'

const props = defineProps<{
  modules: ViteModuleListItem[]
  buildMetrics: VitePluginDetails
  root: string
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
    match: /duration/,
    name: 'duration',
    description: 'Duration',
    icon: 'i-ph-clock-countdown-duotone',
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
]
const searchValue = ref<{ selected: string[] | null, search: false }>({
  selected: settings.value.pluginDetailsTableFields,
  search: false,
})

const selectedFields = computed(() =>
  settings.value.pluginDetailsTableFields
    ? settings.value.pluginDetailsTableFields
    : tableFieldFilterRules.map(rule => rule.name))

const {
  state: showTypeState,
  next: _toggleShowType,
} = useCycleList<ClientSettings['pluginDetailsShowType']>(['changed', 'unchanged', 'all'], {
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

  if (!props.buildMetrics.calls?.filter(item => item.type === settings.value.pluginDetailSelectedHook).filter(item => item.unchanged).length)
    return false
  return true
})
const unchangedInfo = computed(() => {
  const unchanged = props.buildMetrics.calls?.filter(item => item.type === settings.value.pluginDetailSelectedHook).filter(item => item.unchanged)
  const unchangedDuration = unchanged.reduce((acc, item) => acc + item.duration, 0)
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
  <div class="p2 h-full w-full">
    <div class="flex border border-base rounded-2 h-full relative of-hidden">
      <div v-if="expanded" class="of-hidden border-r border-base">
        <FlowmapPluginFlowTimeline
          :build-metrics="buildMetrics"
        >
          <template #header>
            <div class="px2 h10 border-b border-base bg-base rounded-t-2 flex items-center justify-end">
              <button class="w8 h8 rounded-full cursor-pointer hover:bg-active flex items-center justify-center" @click="toggleExpanded(false)">
                <i class="i-ph-sidebar-simple-duotone inline-flex op50" />
              </button>
            </div>
          </template>
        </FlowmapPluginFlowTimeline>
      </div>
      <div class="flex-1 h-full min-h-0 flex flex-col">
        <div class="flex items-center justify-between border-b border-base px2 h10 bg-base rounded-t-2 of-x-auto ws-nowrap">
          <div class="flex items-center h-full">
            <button v-if="!expanded" class="w8 h8 rounded-full cursor-pointer mr1 hover:bg-active flex items-center justify-center" @click="toggleExpanded(true)">
              <i class="i-ph-sidebar-duotone inline-flex op50" />
            </button>
            <DataSearchPanel
              v-model="searchValue" selected-container-class="px0! py1 border-none bg-none flex-nowrap! h-full"
              :rules="tableFieldFilterRules"
              class="[&_[icon-catppuccin]]:(filter-none!) h-full border-none"
            />
          </div>
          <div v-if="showUnchangedInfo" class="flex items-center justify-center gap1 h-full text-xs py1">
            <p class="op50 flex items-center gap-1">
              <DisplayNumberBadge :number="unchangedInfo.count" /> module unchanged, but cost <DisplayDuration :duration="unchangedInfo.duration" />
            </p>
            <button class="rounded-md px2 py1 select-none h-full border border-base rounded-lg hover:bg-active" :title="showTypeText" @click="toggleShowType">
              <div class="text-xs op50">
                {{ showTypeText }}
              </div>
            </button>
          </div>
        </div>
        <div class="flex-1 min-h-0 overscroll-contain">
          <DataPluginDetailsTable
            :modules="modules"
            :build-metrics="buildMetrics"
            :selected-fields="selectedFields"
            :root="root"
          />
        </div>
      </div>
    </div>
  </div>
</template>
