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
  <div flex="~ col" items-center gap-8 font-mono translate-y-50>
    <BannerOxcDevTools />

    <div flex="~ col md:row" items-center gap-4>
      <ContainerCard
        w-70
        flex="~ col"
        items-center
        justify-center
        gap-3
        py5
        px4
        transition-all
        duration-300
        hover:shadow-lg
        dark:hover:shadow="[0_0_20px_rgba(255,255,255,0.1)]"
      >
        <div i-ph-check-circle text-4xl op-fade />
        <p text-xl mt2 font-medium color-base>oxlint</p>

        <div v-if="overview?.oxlint.installed" flex="~ col" items-center>
          <a
            :href="overview?.oxlint.npmxLink"
            target="_blank"
            op-fade
            text-base
            cursor-pointer
            hover:color-active
          >
            v{{ overview?.oxlint.version }}
          </a>
          <span
            v-if="overview?.oxlint.latest"
            badge-color-green
            px2
            py0.5
            rounded
            border
            font-bold
            text-sm
            >Latest</span
          >
          <NuxtLink
            v-else
            to="https://npmx.dev/package/oxlint/v/latest"
            target="_blank"
            cursor-pointer
          >
            <span badge-color-amber px2 py0.5 rounded border font-bold text-sm
              >Update Available</span
            >
          </NuxtLink>
        </div>

        <span v-else op-fade mt4 text-base> Not installed </span>

        <div v-if="overview?.oxlint.installed" flex items-center gap-3 mt2>
          <NuxtLink to="/lint/report" flex items-center gap-1 op-fade text-sm hover:color-active>
            <div i-carbon-report />
            Reports
          </NuxtLink>

          <NuxtLink to="/lint/config" flex items-center gap-1 op-fade text-sm hover:color-active>
            <div i-carbon-settings />
            Config
          </NuxtLink>

          <a
            href="https://oxc.rs/docs/guide/usage/linter.html"
            target="_blank"
            flex
            items-center
            gap-1
            op-fade
            text-sm
            hover:color-active
          >
            <div i-carbon-document />
            Docs
          </a>
        </div>
      </ContainerCard>

      <ContainerCard
        w-70
        flex="~ col"
        items-center
        justify-center
        gap-3
        py5
        px4
        transition-all
        duration-300
        hover:shadow-lg
        dark:hover:shadow="[0_0_20px_rgba(255,255,255,0.1)]"
      >
        <div i-ph-code text-4xl op-fade />
        <p text-xl mt2 font-medium color-base>oxfmt</p>

        <a
          v-if="overview?.oxfmt.installed"
          :href="overview?.oxfmt.npmxLink"
          target="_blank"
          op-fade
          text-base
          cursor-pointer
          hover:color-active
        >
          v{{ overview?.oxfmt.version }}
        </a>
        <div v-if="overview?.oxfmt.installed">
          <span
            v-if="overview?.oxfmt.latest"
            badge-color-green
            px2
            py0.5
            rounded
            border
            font-bold
            text-sm
            >Latest</span
          >
          <NuxtLink
            v-else
            to="https://npmx.dev/package/oxfmt/v/latest"
            target="_blank"
            cursor-pointer
          >
            <span badge-color-amber px2 py0.5 rounded border font-bold text-sm
              >Update Available</span
            >
          </NuxtLink>
        </div>
        <span v-else op-fade mt4 text-base> Not installed </span>

        <div v-if="overview?.oxfmt.installed" flex items-center gap-3 mt2>
          <NuxtLink to="/fmt/config" flex items-center gap-1 op-fade text-sm hover:color-active>
            <div i-carbon-settings />
            Config
          </NuxtLink>

          <a
            href="https://oxc.rs/docs/guide/usage/formatter.html"
            target="_blank"
            flex
            items-center
            gap-1
            op-fade
            text-sm
            hover:color-active
          >
            <div i-carbon-document />
            Docs
          </a>
        </div>
      </ContainerCard>
    </div>

    <div flex="~ col md:row" items-center gap-6>
      <a
        href="https://github.com/yuyinws/oxc-inspector"
        target="_blank"
        flex
        items-center
        gap-1
        op-fade
        hover:color-active
      >
        <div i-lucide-star />
        Star on GitHub
      </a>
      <a
        href="https://github.com/yuyinws/oxc-inspector/discussions/4"
        target="_blank"
        flex
        items-center
        gap-1
        op-fade
        hover:color-active
      >
        <div i-lucide-lightbulb />
        Ideas &amp; Suggestions
      </a>

      <a
        href="https://github.com/yuyinws/oxc-inspector/issues"
        target="_blank"
        flex
        items-center
        gap-1
        op-fade
        hover:color-active
      >
        <div i-lucide-bug />
        Bug Reports
      </a>
    </div>
  </div>
</template>
