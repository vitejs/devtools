<script setup lang="ts">
import type { ModuleListItem, SessionContext } from '~~/shared/types'
import { useRoute } from '#app/composables/router'
import { useRpc } from '#imports'
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import { getFileTypeFromName } from '~/utils/icon'

const isLoading = ref(false)
const params = useRoute().params as {
  session1: string
  session2: string
}

const rpc = useRpc()
const session1 = reactive({
  id: computed(() => params.session1),
  meta: undefined!,
  modulesList: shallowRef<ModuleListItem[]>([]),
  buildDuration: 0,
  assets: [],
  chunks: [],
}) as SessionContext

const session2 = reactive({
  id: computed(() => params.session2),
  meta: undefined!,
  modulesList: shallowRef<ModuleListItem[]>([]),
  buildDuration: 0,
  assets: [],
  chunks: [],
}) as SessionContext

async function getSessionInfo(session: string) {
  const summary = await rpc.value!['vite:rolldown:get-session-summary']!({
    session,
  })

  const modulesList = summary.modules.map(mod => ({
    id: mod.id,
    fileType: getFileTypeFromName(mod.id).name,
    imports: mod.imports ?? [],
    importers: mod.importers ?? [],
    buildMetrics: mod.build_metrics,
  }))

  return {
    ...summary,
    modulesList,
    buildDuration: summary.build_duration,
  }
}

onMounted(async () => {
  isLoading.value = true

  const [session1Info, session2Info] = await Promise.all([getSessionInfo(params.session1), getSessionInfo(params.session2)])
  session1.meta = session1Info.meta!
  session1.modulesList = session1Info.modulesList
  session1.buildDuration = session1Info.buildDuration
  session1.assets = session1Info.assets
  session1.chunks = session1Info.chunks

  session2.meta = session2Info.meta!
  session2.modulesList = session2Info.modulesList
  session2.buildDuration = session2Info.buildDuration
  session2.assets = session2Info.assets
  session2.chunks = session2Info.chunks

  isLoading.value = false
})

const dataTable = computed<{ sessionId: string, createdAt: Date, title: string }[]>(() => {
  return [
    {
      title: 'Session A',
      sessionId: params.session1,
      // @ts-expect-error missing type
      createdAt: new Date(session1.meta?.timestamp ?? 0),
      icon: 'i-ph-hash-duotone',
    },
    {
      title: 'Session B',
      sessionId: params.session2,
      // @ts-expect-error missing type
      createdAt: new Date(session2.meta?.timestamp ?? 0),
      icon: 'i-ph-clock-duotone',
    },
  ]
})

const basicComparisonMetrics = computed(() => {
  return [
    {
      title: 'Modules',
      icon: 'i-ph-graph-duotone',
      current: session2.modulesList.length,
      previous: session1.modulesList.length,
    },
    {
      title: 'Plugins',
      icon: 'i-ph-plugs-duotone',
      current: session2.meta?.plugins.length ?? 0,
      previous: session1.meta?.plugins.length ?? 0,
    },
    {
      title: 'Chunks',
      icon: 'i-ph-shapes-duotone',
      current: session2.chunks.length ?? 0,
      previous: session1.chunks.length ?? 0,
    },
    {
      title: 'Assets',
      icon: 'i-ph-package-duotone',
      current: session2.assets.length ?? 0,
      previous: session1.assets.length ?? 0,
    },
  ]
})
</script>

<template>
  <VisualLoading v-if="isLoading" />
  <div v-else h-screen w-screen max-w-screen max-h-screen of-hidden p6 flex="~ col gap-2">
    <div flex="~ gap-2">
      <NuxtLink btn-action :to="{ path: `/` }">
        <div i-ph-arrow-bend-up-left-duotone />
        Re-select Session
      </NuxtLink>
    </div>
    <div flex="~ col" border="~ base rounded-lg" p3 mt10>
      <div py3 indent-2>
        Compare Overview
      </div>
      <!-- meta info -->
      <div flex="~ gap5" w-full border="b base" pb3>
        <div v-for="item of dataTable" :key="item.title" flex-1 border="~ base rounded" p4 grid="~ cols-[max-content_140px_2fr] max-lg:cols-[max-content_80px_2fr] gap-2 items-center">
          <!-- session meta -->
          <div class="i-ph-hash-duotone" />
          <div>
            {{ item.title }}
          </div>
          <div font-mono>
            <span>{{ item.sessionId }}</span>
          </div>
          <!-- created at meta -->
          <div class="i-ph-clock-duotone" />
          <div>
            Created At
          </div>
          <div font-mono>
            <time :datetime="item.createdAt.toISOString()">{{ item.createdAt.toLocaleString() }}</time>
          </div>
        </div>
      </div>
      <div flex="~ gap5" w-full pt3>
        <div v-for="item of basicComparisonMetrics" :key="item.title" flex-1 border="~ base rounded" p4 flex="~ col" gap2>
          <div font-500 op50 text-4 flex="~ items-center gap-2">
            <div :class="item.icon" class="text-xl" />
            {{ item.title }}
          </div>
          <div flex="~ gap-2" items-center>
            <span font-semibold text-5 font-mono>{{ item.current }}</span>
            <DisplayComparisonMetric :current="item.current" :previous="item.previous" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
