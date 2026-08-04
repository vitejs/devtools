<script setup lang="ts">
import BannerOxcDevTools from '@vitejs/devtools-ui/components/Banner/BannerOxcDevTools.vue'
import { DEVTOOLS_TERMINALS_DOCK_ID } from '@vitejs/devtools-kit/constants'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import { useAsyncState } from '@vueuse/core'
import { computed, ref } from 'vue'
import { createOverview } from '../utils/overview'
import { useRpc } from '#imports'

const rpc = useRpc()
const vitePlusDarkLogo = '/__devtools-oxc/viteplus-dark.svg'
const vitePlusLightLogo = '/__devtools-oxc/viteplus-light.svg'

const {
  state: overview,
  isLoading,
  execute: refreshOverview,
} = useAsyncState(() => rpc.value.call('devtools-oxc:overview'), createOverview())

const isMigrating = ref(false)
const migrationError = ref<string>()
const migrationSessionId = ref<string>()

async function migrateOxlint() {
  await runOxlintSetup('devtools-oxc:migrate-eslint')
}

async function installOxlint() {
  await runOxlintSetup('devtools-oxc:install-oxlint')
}

async function runOxlintSetup(
  action: 'devtools-oxc:migrate-eslint' | 'devtools-oxc:install-oxlint',
) {
  isMigrating.value = true
  migrationError.value = undefined
  migrationSessionId.value = undefined
  try {
    const { sessionId } = await rpc.value.call(action)
    migrationSessionId.value = sessionId
    await rpc.value.call('devtools-oxc:wait-for-setup')
    await refreshOverview()
  } catch (error) {
    migrationError.value = error instanceof Error ? error.message : String(error)
  } finally {
    isMigrating.value = false
  }
}

async function viewMigrationInTerminal() {
  if (!migrationSessionId.value) return
  await rpc.value.call('hub:docks:activate', {
    dockId: DEVTOOLS_TERMINALS_DOCK_ID,
    params: { sessionId: migrationSessionId.value },
  })
}

interface ToolView {
  title: string
  description: string
  icon: string
  to: string
}

const tools = computed(() => {
  const oxlint = overview.value.oxlint
  const oxlintViews: ToolView[] = [
    ...(oxlint.installed
      ? [
          {
            title: 'Lint Inspector',
            description: 'View diagnostics and rules',
            icon: 'i-ph-magnifying-glass-duotone',
            to: '/oxlint/lint',
          },
          {
            title: 'Config Inspector',
            description: 'Inspect configuration files',
            icon: 'i-ph-gear-duotone',
            to: '/oxlint/config',
          },
        ]
      : []),
    {
      title: 'Documents',
      description: 'Guides and references',
      icon: 'i-ph-book-open-duotone',
      to: '/oxlint/documents',
    },
  ]
  const oxfmtViews: ToolView[] = [
    {
      title: 'Documents',
      description: 'Guides and references',
      icon: 'i-ph-book-open-duotone',
      to: '/oxfmt/documents',
    },
  ]

  return [
    {
      id: 'oxlint',
      name: 'Oxlint',
      info: oxlint,
      views: oxlintViews,
    },
    {
      id: 'oxfmt',
      name: 'Oxfmt',
      info: overview.value.oxfmt,
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
        class="border border-base rounded-lg p-4 flex-1 min-w-120"
      >
        <div class="flex flex-col gap-6 h-full">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-2xl font-semibold">{{ tool.name }}</div>
              <a
                v-if="tool.info.installed"
                :href="tool.info.npmxLink"
                target="_blank"
                class="block mt-1 hover:color-active op-fade text-sm font-mono"
              >
                v{{ tool.info.version }}
              </a>
            </div>
            <template v-if="tool.info.installed">
              <a
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
            </template>
            <DisplayBadge v-else text="Not installed" :color="false" class="badge-color-gray" />
          </div>

          <div class="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2">
            <button
              v-if="tool.id === 'oxlint' && overview.needsOxlintMigration"
              type="button"
              class="rounded-lg px-3 py-3 flex items-start gap-3 hover:bg-active transition-colors disabled:pointer-events-none disabled:op30!"
              :disabled="isMigrating"
              @click="migrateOxlint"
            >
              <div class="i-simple-icons:eslint text-2xl mt-0.5" />
              <div class="text-left">
                <div class="font-medium">
                  {{ isMigrating ? 'Migrating…' : 'Migrate from ESLint' }}
                </div>
                <div class="text-xs op-fade mt-0.5">Migrate from ESLint flat config</div>
              </div>
            </button>
            <button
              v-if="tool.id === 'oxlint' && !tool.info.installed && !overview.needsOxlintMigration"
              type="button"
              class="rounded-lg px-3 py-3 flex items-start gap-3 hover:bg-active transition-colors disabled:pointer-events-none disabled:op30!"
              :disabled="isMigrating"
              @click="installOxlint"
            >
              <div class="i-ph-rocket-launch-duotone text-2xl mt-0.5" />
              <div class="text-left">
                <div class="font-medium">{{ isMigrating ? 'Installing…' : 'Install Oxlint' }}</div>
                <div class="text-xs op-fade mt-0.5">Install & set up Oxlint</div>
              </div>
            </button>
            <NuxtLink
              v-for="view in tool.views"
              :key="view.title"
              :to="view.to"
              class="rounded-lg px-3 py-3 flex items-start gap-3 hover:bg-active transition-colors"
            >
              <div :class="[view.icon, 'text-2xl mt-0.5']" />
              <div class="text-left">
                <div class="font-medium">{{ view.title }}</div>
                <div class="text-xs op-fade mt-0.5">{{ view.description }}</div>
              </div>
            </NuxtLink>
          </div>
          <p v-if="tool.id === 'oxlint' && migrationError" class="text-sm text-red">
            {{ migrationError }}
          </p>
        </div>
      </div>
    </div>
    <button
      v-if="isMigrating && migrationSessionId"
      type="button"
      class="btn-action flex items-center gap-2 px3 py2 text-sm"
      @click="viewMigrationInTerminal"
    >
      <div class="i-ph-terminal-window-duotone" />
      View in terminals
    </button>
  </div>
</template>
