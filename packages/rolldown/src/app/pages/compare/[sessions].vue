<script setup lang="ts">
import type {
  SessionCompareContext,
  SessionCompareDetails,
} from '~~/shared/types'
import PanelSideNav from '@vitejs/devtools-ui/components/Panel/PanelSideNav.vue'
import { useSideNav } from '@vitejs/devtools-ui/composables/nav'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from '#app/composables/router'
import { useRpc } from '#imports'

type NormalizedSessionCompareContext = SessionCompareContext & { createdAt: Date, title: string }

const params = useRoute().params as {
  sessions: string
}

const rpc = useRpc()
const isLoading = ref(true)
const sessions = ref<SessionCompareContext[]>([])
const details = ref<SessionCompareDetails | null>(null)
const compareTabs = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'i-ph-house-duotone',
  },
  {
    id: 'plugins',
    label: 'Plugins',
    icon: 'i-ph-plugs-duotone',
  },
  {
    id: 'chunks',
    label: 'Chunks',
    icon: 'i-ph-shapes-duotone',
  },
  {
    id: 'assets',
    label: 'Assets',
    icon: 'i-ph-files-duotone',
  },
  {
    id: 'packages',
    label: 'Packages',
    icon: 'i-ph-package-duotone',
  },
]

const normalizedSessions = computed<NormalizedSessionCompareContext[]>(() => {
  return sessions.value.map((session, index) => ({
    ...session,
    // @ts-expect-error missing type
    createdAt: new Date(session.meta?.timestamp ?? 0),
    title: index === 0 ? 'Session A' : 'Session B',
  }))
})

useSideNav(() => {
  return compareTabs.map(tab => ({
    title: tab.label,
    icon: tab.icon,
    to: tab.id === 'overview'
      ? `/compare/${params.sessions}`
      : `/compare/${params.sessions}/${tab.id}`,
  }))
})

onMounted(async () => {
  const sessionIds = params.sessions.split(',')

  const [summary, compareDetails] = await Promise.all([
    rpc.value.call(
      'vite:rolldown:get-session-compare-summary',
      { sessions: sessionIds },
    ),
    rpc.value.call(
      'vite:rolldown:get-session-compare-details',
      { sessions: sessionIds },
    ),
  ])

  sessions.value = summary
  details.value = compareDetails
  isLoading.value = false
})
</script>

<template>
  <VisualLoading v-if="isLoading" />
  <div v-else grid="~ cols-[max-content_1fr]" h-screen w-screen max-w-screen max-h-screen of-hidden>
    <PanelSideNav />
    <div of-auto h-screen max-h-screen relative p6 flex="~ col gap-4">
      <div flex="~ gap-2 items-center">
        <NuxtLink btn-action :to="{ path: `/` }">
          <div i-ph-arrow-bend-up-left-duotone />
          Re-select Session
        </NuxtLink>
      </div>

      <NuxtPage
        :sessions="normalizedSessions"
        :details="details"
        :tabs="compareTabs"
      />
    </div>
  </div>
</template>
