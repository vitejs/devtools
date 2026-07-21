<script setup lang="ts">
import BannerOxcDevTools from '@vitejs/devtools-ui/components/Banner/BannerOxcDevTools.vue'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import DisplayFileIcon from '@vitejs/devtools-ui/components/Display/DisplayFileIcon.vue'
import DisplayNumberBadge from '@vitejs/devtools-ui/components/Display/DisplayNumberBadge.vue'
import { useAsyncState } from '@vueuse/core'
import { computed } from 'vue'
import { useRpc } from '#imports'

const rpc = useRpc()
const vitePlusDarkLogo = '/__devtools-oxc/viteplus-dark.svg'
const vitePlusLightLogo = '/__devtools-oxc/viteplus-light.svg'

const { state: overview, isLoading } = useAsyncState(
  () => rpc.value.call('devtools-oxc:overview'),
  {
    oxlint: {
      installed: false,
      version: undefined,
      latest: true,
      npmxLink: undefined,
    },
    oxfmt: {
      installed: false,
      version: undefined,
      latest: true,
      npmxLink: undefined,
    },
    vitePlus: undefined,
  },
)

const { state: configFiles } = useAsyncState(
  () => rpc.value.call('devtools-oxc:get-config-files'),
  [],
)

interface ToolView {
  title: string
  icon: string
  to: string
}

const tools = computed(() => {
  const oxlint = overview.value.oxlint
  const oxlintViews: ToolView[] = [
    ...(oxlint.installed
      ? [
          { title: 'Lint Inspector', icon: 'i-ph-magnifying-glass-duotone', to: '/oxlint/lint' },
          // { title: 'Config Inspector', icon: 'i-ph-gear-duotone', to: '/oxlint/config' },
        ]
      : []),
    { title: 'Documents', icon: 'i-ph-book-open-duotone', to: '/oxlint/documents' },
  ]
  const oxfmtViews: ToolView[] = [
    { title: 'Documents', icon: 'i-ph-book-open-duotone', to: '/oxfmt/documents' },
  ]

  return [
    {
      id: 'oxlint',
      name: 'Oxlint',
      info: oxlint,
      configs: configFiles.value.filter(file => file.tool === 'oxlint'),
      views: oxlintViews,
    },
    {
      id: 'oxfmt',
      name: 'Oxfmt',
      info: overview.value.oxfmt,
      configs: configFiles.value.filter(file => file.tool === 'oxfmt'),
      views: oxfmtViews,
    },
  ]
})
</script>

<template>
  <VisualLoading v-if="isLoading" text="Connecting..." />
  <div v-else class="h-full p4 flex flex-col gap-5 items-center justify-center relative">
    <div class="w-fit mx-auto flex flex-col items-center gap-3">
      <BannerOxcDevTools />
      <a
        v-if="overview.vitePlus"
        href="https://viteplus.dev/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Powered by Vite+"
      >
        <DisplayBadge
          :color="false"
          size="lg"
          class="border border-#6254FE/30 bg-#6254FE/10 dark:border-#8B7FFF/40 dark:bg-#6254FE/20 px-2 py-1 flex items-center gap-1 text-xs font-normal"
        >
          <span class="color-#6254FE dark:color-#A89FFF font-semibold">Via</span>
          <img :src="vitePlusDarkLogo" alt="" class="h-3 w-20 dark:hidden" />
          <img :src="vitePlusLightLogo" alt="" class="hidden h-3 w-20 dark:block" />
          <span class="color-#6254FE dark:color-#A89FFF font-semibold"
            >v{{ overview.vitePlus }}</span
          >
        </DisplayBadge>
      </a>
    </div>

    <div class="flex flex-col lg:flex-row gap-4 mx-auto">
      <div
        v-for="tool in tools"
        :key="tool.id"
        class="border border-base rounded p2 flex-1 min-w-max"
      >
        <div class="p4 flex flex-col gap-4 h-full">
          <div class="text-2xl font-semibold">{{ tool.name }}</div>

          <div class="grid grid-cols-[max-content_160px_2fr] gap-2 items-center">
            <div class="i-ph-tag-duotone op-fade" />
            <span class="op-fade">Version</span>
            <div class="flex items-center gap-2 w-full">
              <a
                v-if="tool.info.installed"
                :href="tool.info.npmxLink"
                target="_blank"
                class="hover:color-active font-mono"
              >
                v{{ tool.info.version }}
              </a>
              <span v-else class="op-fade">Not installed</span>
              <a
                v-if="tool.info.installed"
                :href="
                  tool.info.latest ? undefined : `https://npmx.dev/package/${tool.id}/v/latest`
                "
                :target="tool.info.latest ? undefined : '_blank'"
                class="hover:color-active"
              >
                <DisplayBadge
                  :text="tool.info.latest ? 'Latest' : 'Update Available'"
                  :color="false"
                  :class="tool.info.latest ? 'badge-color-green' : 'badge-color-amber'"
                />
              </a>
            </div>

            <div class="i-ph-files-duotone op-fade" />
            <span class="op-fade">Configs</span>
            <VDropdown v-if="tool.configs.length" placement="bottom-start" :triggers="['hover']">
              <DisplayNumberBadge
                :number="tool.configs.length"
                class="py1 rounded-full font-mono inline-block text-sm cursor-pointer hover:color-active"
              />

              <template #popper>
                <div class="p3 min-w-60 flex flex-col gap-2 font-mono text-sm">
                  <div
                    v-for="config in tool.configs"
                    :key="`${config.tool}:${config.path}`"
                    class="flex items-center gap-2"
                  >
                    <DisplayFileIcon class="flex-none" :filename="config.path" />
                    <span>{{ config.path }}</span>
                  </div>
                </div>
              </template>
            </VDropdown>
            <span v-else class="op-fade text-sm">Not found</span>
          </div>

          <div class="flex gap-2">
            <NuxtLink
              v-for="view in tool.views"
              :key="view.title"
              :to="view.to"
              class="btn-action flex flex-col flex-1 min-w-max p4 !px4 whitespace-nowrap"
            >
              <div :class="[view.icon, 'text-2xl']" />
              {{ view.title }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
