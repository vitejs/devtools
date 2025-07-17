<script setup lang="ts">
import type { ModuleListItem, SessionContext } from '~~/shared/types'
import { useRoute, useRouter } from '#app/composables/router'
import { useRpc } from '#imports'
import { vOnClickOutside } from '@vueuse/components'
import { onKeyDown } from '@vueuse/core'
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import { useSideNav } from '~/state/nav'
import { getFileTypeFromName } from '~/utils/icon'

const params = useRoute().params as {
  session: string
}

const isLoading = ref(true)
const session = reactive({
  id: computed(() => params.session),
  meta: undefined!,
  modulesList: shallowRef<ModuleListItem[]>([]),
}) as SessionContext
const rpc = useRpc()
const router = useRouter()
const route = useRoute()

function closeFlowPanel() {
  router.replace({ query: { ...route.query, module: undefined } })
}

function closeAssetPanel() {
  router.replace({ query: { ...route.query, asset: undefined } })
}

onKeyDown('Escape', (e) => {
  e.preventDefault()

  if (!e.isTrusted || e.repeat)
    return

  const { module, asset } = route.query

  if (module)
    closeFlowPanel()

  if (asset)
    closeAssetPanel()
})

useSideNav(() => {
  if (!session.meta)
    return []
  return [
    {
      title: 'Home',
      to: `/session/${session.id}`,
      icon: 'i-ph-house-duotone',
    },
    {
      title: 'Modules Graph',
      to: `/session/${session.id}/graph`,
      icon: 'i-ph-graph-duotone',
      category: 'session',
    },
    {
      title: 'Plugins',
      to: `/session/${session.id}/plugins`,
      icon: 'i-ph-plugs-duotone',
      category: 'session',
    },
    {
      title: 'Chunks',
      to: `/session/${session.id}/chunks`,
      icon: 'i-ph-shapes-duotone ',
      category: 'session',
    },
    {
      title: 'Assets',
      to: `/session/${session.id}/assets`,
      icon: 'i-ph-package-duotone',
      category: 'session',
    },
  ]
})

onMounted(async () => {
  const summary = await rpc.value!['vite:rolldown:get-session-summary']!({
    session: params.session,
  })
  session.meta = summary.meta!
  session.modulesList = summary.modules.map(mod => ({
    id: mod.id,
    fileType: getFileTypeFromName(mod.id).name,
    imports: mod.imports ?? [],
    importers: mod.importers ?? [],
  }))
  isLoading.value = false
})
</script>

<template>
  <VisualLoading v-if="isLoading" />
  <div v-else grid="~ cols-[max-content_1fr]" h-screen w-screen max-w-screen max-h-screen of-hidden>
    <PanelSideNav />
    <div of-auto h-screen max-h-screen relative>
      <NuxtPage :session="session" />
    </div>

    <div
      v-if="route.query.module" fixed inset-0
      backdrop-blur-8 backdrop-brightness-95 z-panel-content
    >
      <div
        :key="(route.query.module as string)"
        v-on-click-outside="closeFlowPanel"
        fixed right-0 bottom-0 top-20 left-20 z-panel-content
        bg-glass border="l t base rounded-tl-xl"
      >
        <DataModuleDetailsLoader
          :module="(route.query.module as string)"
          :session="session"
          @close="closeFlowPanel"
        />
      </div>
    </div>

    <!-- for assets -->
    <div
      v-if="route.query.asset" fixed inset-0
      backdrop-blur-8 backdrop-brightness-95 z-panel-content
    >
      <div
        :key="(route.query.asset as string)"
        v-on-click-outside="closeAssetPanel"
        fixed right-0 bottom-0 top-30 z-panel-content of-auto
        bg-glass border="l t base rounded-tl-xl"
        class="left-20 xl:left-100 2xl:left-150"
      >
        <DataAssetDetailsLoader
          :asset="(route.query.asset as string)"
          :session="session"
          @close="closeAssetPanel"
        />
      </div>
    </div>
  </div>
</template>
