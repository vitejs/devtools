<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import DisplayDuration from '@vitejs/devtools-ui/components/Display/DisplayDuration.vue'
import DisplayNumberBadge from '@vitejs/devtools-ui/components/Display/DisplayNumberBadge.vue'
import { sideNavItems } from '@vitejs/devtools-ui/composables/nav'
import { computed } from 'vue'

const props = defineProps<{
  session: SessionContext
}>()

interface DataTableItem {
  title: string
  value: string | number | Date
  type?: 'string' | 'badge' | 'number' | 'duration'
  icon: string
}

const dataTable = computed<DataTableItem[]>(() => {
  return [
    {
      title: 'Build ID',
      value: props.session.id,
      icon: 'i-ph-hash-duotone',
    },
    {
      title: 'Created At',
      // @ts-expect-error missing type
      value: new Date(props.session.meta.timestamp),
      icon: 'i-ph-clock-duotone',
    },
    {
      title: 'Build Duration',
      value: props.session.buildDuration,
      icon: 'i-ph-timer-duotone',
      type: 'duration',
    },
    {
      title: 'Directory',
      value: props.session.meta.cwd,
      icon: 'i-ph-folder-duotone',
    },
    {
      title: 'Total Modules',
      value: props.session.modulesList.length,
      icon: 'i-ph-files-duotone',
    },
    {
      title: 'Plugins',
      value: props.session.meta.plugins.length,
      icon: 'i-ph-plugs-duotone',
    },
    {
      title: 'Platform',
      value: props.session.meta.platform,
      icon: 'i-ph-cpu-duotone',
      type: 'badge',
    },
    {
      title: 'Format',
      value: props.session.meta.format,
      icon: 'i-ph-file-duotone',
      type: 'badge',
    },
  ]
})
</script>

<template>
  <div class="flex flex-col gap-2 p6">
    <div class="flex gap-2">
      <NuxtLink class="btn-action" :to="{ path: `/` }">
        <div class="i-ph-arrow-bend-up-left-duotone" />
        Re-select Session
      </NuxtLink>
    </div>

    <div class="op50 mt-10">
      Meta Info
    </div>
    <div class="border border-base rounded p4 grid grid-cols-[max-content_160px_2fr] gap-2 items-center">
      <template v-for="item of dataTable" :key="item.title">
        <div :class="item.icon" />
        <div>
          {{ item.title }}
        </div>
        <div class="font-mono truncate">
          <time v-if="(item.value instanceof Date)" :datetime="item.value.toISOString()">{{ item.value.toLocaleString() }}</time>
          <DisplayBadge v-else-if="item.type === 'badge'" :text="String(item.value)" class="py1" />
          <DisplayDuration v-else-if="item.type === 'duration'" :duration="+item.value" />
          <DisplayNumberBadge v-else-if="typeof item.value === 'number'" :number="item.value" class="py1 rounded-full inline-block text-sm" />
          <span v-else>{{ item.value }}</span>
        </div>
      </template>
    </div>

    <div class="op50 mt-4">
      Build Entries
    </div>
    <div class="border border-base rounded p4 grid grid-cols-[max-content_1fr] gap-2 items-center">
      <template v-for="input of props.session.meta.inputs" :key="input">
        <DisplayBadge :text="input.name || ''" />
        <DisplayModuleId :id="input.filename || ''" :session="session" :link="true" />
      </template>
    </div>

    <div class="op50 mt-4">
      Views
    </div>
    <div class="flex flex-wrap gap-2">
      <template v-for="item of sideNavItems" :key="item.to">
        <NuxtLink v-if="item.category === 'session'" class="btn-action flex flex-col min-w-40 p4" :to="{ path: item.to }">
          <div :class="item.icon" class="text-2xl" />
          {{ item.title }}
        </NuxtLink>
      </template>
    </div>
  </div>
</template>
