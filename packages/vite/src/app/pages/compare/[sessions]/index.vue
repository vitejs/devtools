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

  const summary = await rpc.value.$call(
    'vite:rolldown:get-session-compare-summary',
    { sessions: params.sessions.split(',') },
  )

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

const comparisonMetrics = computed(() => {
  const [sessionA, sessionB] = normalizedSessions.value
  return [
    {
      name: 'Bundle Size',
      description: 'Total file size of the assets',
      icon: 'i-ph-package-duotone',
      current: sessionB?.bundle_size ?? 0,
      previous: sessionA?.bundle_size ?? 0,
      format: 'bytes',
    },
    {
      name: 'Initial JS',
      description: 'Total file size of the initial JS chunks',
      icon: 'i-ph-file-js-duotone',
      current: sessionB?.initial_js ?? 0,
      previous: sessionA?.initial_js ?? 0,
      format: 'bytes',
    },
    {
      name: 'Modules',
      description: 'Total number of modules',
      icon: 'i-ph-graph-duotone',
      current: sessionB?.modules ?? 0,
      previous: sessionA?.modules ?? 0,
    },
    {
      name: 'Plugins',
      description: 'Total number of plugins',
      icon: 'i-ph-plugs-duotone',
      current: sessionB?.meta?.plugins.length ?? 0,
      previous: sessionA?.meta?.plugins.length ?? 0,
    },
    {
      name: 'Chunks',
      description: 'Total number of chunks',
      icon: 'i-ph-shapes-duotone',
      current: sessionB?.chunks ?? 0,
      previous: sessionA?.chunks ?? 0,
    },
    {
      name: 'Assets',
      description: 'Total number of assets',
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
      <CompareSessionMeta :sessions="normalizedSessions" />
      <div grid="~ cols-4 gap5" w-full pt3>
        <div v-for="(item, index) of comparisonMetrics" :key="item.name" :class="index < 2 ? 'col-span-2' : 'col-span-1'" border="~ base rounded" p4 flex="~ col" gap2>
          <CompareMetricCard v-bind="item" />
        </div>
      </div>
    </div>
  </div>
</template>
