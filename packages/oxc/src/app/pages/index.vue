<script setup lang="ts">
import BannerOxcDevTools from '@vitejs/devtools-ui/components/Banner/BannerOxcDevTools.vue'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import DisplayFileIcon from '@vitejs/devtools-ui/components/Display/DisplayFileIcon.vue'
import DisplayNumberBadge from '@vitejs/devtools-ui/components/Display/DisplayNumberBadge.vue'
import { useAsyncState } from '@vueuse/core'
import { computed } from 'vue'
import { useRpc } from '#imports'

const rpc = useRpc()

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
          { title: 'Config Inspector', icon: 'i-ph-gear-duotone', to: '/oxlint/config' },
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
  <div v-else h-full p4 flex="~ col gap-4" items-center justify-center relative>
    <BannerOxcDevTools mx-auto />

    <div flex="~ col lg:row gap-4" mx-auto mt-4>
      <div v-for="tool in tools" :key="tool.id" border="~ base rounded" p2 flex-1 min-w-max>
        <div p4 flex="~ col gap-4" h-full>
          <div text-2xl font-semibold>
            {{ tool.name }}
          </div>

          <div grid="~ cols-[max-content_160px_2fr] gap-2 items-center">
            <div i-ph-tag-duotone op-fade />
            <span op-fade>Version</span>
            <div flex items-center gap-2 w-full>
              <a
                v-if="tool.info.installed"
                :href="tool.info.npmxLink"
                target="_blank"
                hover:color-active
                font-mono
              >
                v{{ tool.info.version }}
              </a>
              <span v-else op-fade>Not installed</span>
              <a
                v-if="tool.info.installed"
                :href="
                  tool.info.latest ? undefined : `https://npmx.dev/package/${tool.id}/v/latest`
                "
                :target="tool.info.latest ? undefined : '_blank'"
                hover:color-active
              >
                <DisplayBadge
                  :text="tool.info.latest ? 'Latest' : 'Update Available'"
                  :color="false"
                  :class="tool.info.latest ? 'badge-color-green' : 'badge-color-amber'"
                />
              </a>
            </div>

            <div i-ph-files-duotone op-fade />
            <span op-fade>Configs</span>
            <VDropdown v-if="tool.configs.length" placement="bottom-start" :triggers="['hover']">
              <DisplayNumberBadge
                :number="tool.configs.length"
                py1
                rounded-full
                font-mono
                inline-block
                text-sm
                cursor-pointer
                hover:color-active
              />

              <template #popper>
                <div p3 min-w-60 flex="~ col gap-2" font-mono text-sm>
                  <div
                    v-for="config in tool.configs"
                    :key="`${config.tool}:${config.path}`"
                    flex
                    items-center
                    gap-2
                  >
                    <DisplayFileIcon flex-none :filename="config.path" />
                    <span>{{ config.path }}</span>
                  </div>
                </div>
              </template>
            </VDropdown>
            <DisplayNumberBadge
              v-else
              :number="0"
              py1
              font-mono
              rounded-full
              inline-block
              text-sm
            />
          </div>

          <div flex="~ gap-2">
            <NuxtLink
              v-for="view in tool.views"
              :key="view.title"
              btn-action
              :to="view.to"
              flex="~ col"
              flex-1
              min-w-max
              p4
              px4!
              whitespace-nowrap
            >
              <div :class="view.icon" text-2xl />
              {{ view.title }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
