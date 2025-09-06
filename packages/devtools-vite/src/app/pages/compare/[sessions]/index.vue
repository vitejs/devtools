<script setup lang="ts">
import type { SessionCompareContext } from '~~/shared/types'
import { useRoute } from '#app/composables/router'
import { useRpc } from '#imports'
import { computed, onMounted, ref } from 'vue'

const isLoading = ref(false)
const params = useRoute().params as {
  sessions: string
}

const rpc = useRpc()
const sessions = ref<SessionCompareContext[]>([])

onMounted(async () => {
  isLoading.value = true

  const summary = await rpc.value!['vite:rolldown:get-session-compare-summary']!({
    sessions: params.sessions.split(','),
  })

  sessions.value = summary

  isLoading.value = false
})

const normalizedSessions = computed<Array<SessionCompareContext & { createdAt: Date, title: string }>>(() => {
  return sessions.value.map((session, index) => ({
    ...session,
    // @ts-expect-error missing type
    createdAt: new Date(session.meta?.timestamp ?? 0),
    title: index === 0 ? 'Session A' : 'Session B',
  }))
})

const basicComparisonMetrics = computed(() => {
  const [sessionA, sessionB] = normalizedSessions.value
  return [
    {
      title: 'Modules',
      icon: 'i-ph-graph-duotone',
      current: sessionB?.modules ?? 0,
      previous: sessionA?.modules ?? 0,
    },
    {
      title: 'Plugins',
      icon: 'i-ph-plugs-duotone',
      current: sessionB?.meta?.plugins.length ?? 0,
      previous: sessionA?.meta?.plugins.length ?? 0,
    },
    {
      title: 'Chunks',
      icon: 'i-ph-shapes-duotone',
      current: sessionB?.chunks ?? 0,
      previous: sessionA?.chunks ?? 0,
    },
    {
      title: 'Assets',
      icon: 'i-ph-package-duotone',
      current: sessionB?.assets ?? 0,
      previous: sessionA?.assets ?? 0,
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
        <div v-for="(item) of normalizedSessions" :key="item.id" flex-1 border="~ base rounded" p4 grid="~ cols-[max-content_140px_2fr] max-lg:cols-[max-content_80px_2fr] gap-2 items-center">
          <!-- session meta -->
          <div class="i-ph-hash-duotone" />
          <div>
            {{ item.title }}
          </div>
          <div font-mono>
            <span>{{ item.id }}</span>
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
