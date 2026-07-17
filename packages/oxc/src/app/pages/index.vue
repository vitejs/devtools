<script setup lang="ts">
import ContainerCard from '@vitejs/devtools-ui/components/Container/ContainerCard.vue'
import BannerOxcDevTools from '@vitejs/devtools-ui/components/Banner/BannerOxcDevTools.vue'
import { useAsyncState } from '@vueuse/core'
import { useRpc } from '#imports'

const rpc = useRpc()

const { state: overview } = useAsyncState(() => rpc.value.call('devtools-oxc:overview'), {
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
})
</script>

<template>
  <div class="flex flex-col items-center gap-8 font-mono translate-y-50">
    <BannerOxcDevTools />

    <div class="flex flex-col md:flex-row items-center gap-4">
      <ContainerCard
        class="w-70 flex flex-col items-center justify-center gap-3 py5 px4 transition-all duration-300 hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
      >
        <div class="i-ph-check-circle text-4xl op-fade" />
        <p class="text-xl mt2 font-medium color-base">oxlint</p>

        <div v-if="overview?.oxlint.installed" class="flex flex-col items-center">
          <a
            :href="overview?.oxlint.npmxLink"
            target="_blank"
            class="op-fade text-base cursor-pointer hover:color-active"
          >
            v{{ overview?.oxlint.version }}
          </a>
          <span
            v-if="overview?.oxlint.latest"
            class="badge-color-green px2 py0.5 rounded border font-bold text-sm"
            >Latest</span
          >
          <NuxtLink
            v-else
            to="https://npmx.dev/package/oxlint/v/latest"
            target="_blank"
            class="cursor-pointer"
          >
            <span class="badge-color-amber px2 py0.5 rounded border font-bold text-sm"
              >Update Available</span
            >
          </NuxtLink>
        </div>

        <span v-else class="op-fade mt4 text-base"> Not installed </span>

        <div v-if="overview?.oxlint.installed" class="flex items-center gap-3 mt2">
          <NuxtLink
            to="/lint/report"
            class="flex items-center gap-1 op-fade text-sm hover:color-active"
          >
            <div class="i-carbon-report" />
            Reports
          </NuxtLink>

          <NuxtLink
            to="/lint/config"
            class="flex items-center gap-1 op-fade text-sm hover:color-active"
          >
            <div class="i-carbon-settings" />
            Config
          </NuxtLink>

          <a
            href="https://oxc.rs/docs/guide/usage/linter.html"
            target="_blank"
            class="flex items-center gap-1 op-fade text-sm hover:color-active"
          >
            <div class="i-carbon-document" />
            Docs
          </a>
        </div>
      </ContainerCard>

      <ContainerCard
        class="w-70 flex flex-col items-center justify-center gap-3 py5 px4 transition-all duration-300 hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
      >
        <div class="i-ph-code text-4xl op-fade" />
        <p class="text-xl mt2 font-medium color-base">oxfmt</p>

        <a
          v-if="overview?.oxfmt.installed"
          :href="overview?.oxfmt.npmxLink"
          target="_blank"
          class="op-fade text-base cursor-pointer hover:color-active"
        >
          v{{ overview?.oxfmt.version }}
        </a>
        <div v-if="overview?.oxfmt.installed">
          <span
            v-if="overview?.oxfmt.latest"
            class="badge-color-green px2 py0.5 rounded border font-bold text-sm"
            >Latest</span
          >
          <NuxtLink
            v-else
            to="https://npmx.dev/package/oxfmt/v/latest"
            target="_blank"
            class="cursor-pointer"
          >
            <span class="badge-color-amber px2 py0.5 rounded border font-bold text-sm"
              >Update Available</span
            >
          </NuxtLink>
        </div>
        <span v-else class="op-fade mt4 text-base"> Not installed </span>

        <div v-if="overview?.oxfmt.installed" class="flex items-center gap-3 mt2">
          <NuxtLink
            to="/fmt/config"
            class="flex items-center gap-1 op-fade text-sm hover:color-active"
          >
            <div class="i-carbon-settings" />
            Config
          </NuxtLink>

          <a
            href="https://oxc.rs/docs/guide/usage/formatter.html"
            target="_blank"
            class="flex items-center gap-1 op-fade text-sm hover:color-active"
          >
            <div class="i-carbon-document" />
            Docs
          </a>
        </div>
      </ContainerCard>
    </div>

    <div class="flex flex-col md:flex-row items-center gap-6">
      <a
        href="https://github.com/yuyinws/oxc-inspector"
        target="_blank"
        class="flex items-center gap-1 op-fade hover:color-active"
      >
        <div class="i-lucide-star" />
        Star on GitHub
      </a>
      <a
        href="https://github.com/yuyinws/oxc-inspector/discussions/4"
        target="_blank"
        class="flex items-center gap-1 op-fade hover:color-active"
      >
        <div class="i-lucide-lightbulb" />
        Ideas &amp; Suggestions
      </a>

      <a
        href="https://github.com/yuyinws/oxc-inspector/issues"
        target="_blank"
        class="flex items-center gap-1 op-fade hover:color-active"
      >
        <div class="i-lucide-bug" />
        Bug Reports
      </a>
    </div>
  </div>
</template>
