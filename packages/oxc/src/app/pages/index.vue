<script setup lang="ts">
import BannerOxcDevTools from '@vitejs/devtools-ui/components/banners/BannerOxcDevTools'
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

const cardUi = {
  body: 'p-4 flex flex-col items-center justify-center',
}
</script>

<template>
  <div class="flex flex-col items-center gap-8 font-mono translate-y-50">
    <BannerOxcDevTools />

    <div class="flex flex-col md:flex-row items-center gap-4">
      <UCard
        class="flex flex-col items-center justify-center gap-3 w-70 py-5 hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300"
        :ui="cardUi"
      >
        <u-icon name="ph:check-circle" class="w-10 h-10 text-neutral-500 dark:text-neutral-400" />
        <p class="text-xl mt-2 font-medium text-neutral-700 dark:text-neutral-300">oxlint</p>

        <div v-if="overview?.oxlint.installed" class="flex flex-col items-center">
          <UButton
            size="sm"
            variant="link"
            trailing-icon
            :to="overview?.oxlint.npmxLink"
            target="_blank"
            class="text-neutral-500 cursor-pointer text-base dark:text-neutral-400"
          >
            v{{ overview?.oxlint.version }}
          </UButton>
          <UBadge
            color="success"
            size="sm"
            class="font-bold rounded-sm"
            v-if="overview?.oxlint.latest"
            >Latest</UBadge
          >
          <nuxt-link
            v-else
            to="https://npmx.dev/package/oxlint/v/latest"
            target="_blank"
            class="cursor-pointer"
          >
            <UBadge color="warning" size="sm" class="font-bold rounded-sm">Update Available</UBadge>
          </nuxt-link>
        </div>

        <span v-else class="text-neutral-500 mt-4 text-base dark:text-neutral-400">
          Not installed
        </span>

        <div class="flex items-center mt-2" v-if="overview?.oxlint.installed">
          <UButton
            to="/lint/report"
            icon="carbon:report"
            size="sm"
            variant="link"
            trailing-icon
            class="text-neutral-500 dark:text-neutral-400"
          >
            Reports
          </UButton>

          <UButton
            to="/lint/config"
            icon="carbon:settings"
            size="sm"
            variant="link"
            trailing-icon
            class="text-neutral-500 dark:text-neutral-400"
          >
            Config
          </UButton>

          <UButton
            to="https://oxc.rs/docs/guide/usage/linter.html"
            target="_blank"
            icon="carbon:document"
            size="sm"
            variant="link"
            trailing-icon
            class="text-neutral-500 dark:text-neutral-400"
          >
            Docs
          </UButton>
        </div>
      </UCard>

      <UCard
        class="flex flex-col items-center justify-center gap-3 w-70 py-5 hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300"
        :ui="cardUi"
      >
        <u-icon name="ph:code" class="w-10 h-10 text-neutral-500 dark:text-neutral-400" />
        <p class="text-xl font-medium mt-2 text-neutral-700 dark:text-neutral-300">oxfmt</p>

        <UButton
          v-if="overview?.oxfmt.installed"
          size="sm"
          variant="link"
          trailing-icon
          :to="overview?.oxfmt.npmxLink"
          target="_blank"
          class="text-neutral-500 cursor-pointer dark:text-neutral-400 text-base"
        >
          v{{ overview?.oxfmt.version }}
        </UButton>
        <div v-if="overview?.oxfmt.installed">
          <UBadge
            color="success"
            size="sm"
            class="font-bold rounded-sm"
            v-if="overview?.oxfmt.latest"
            >Latest</UBadge
          >

          <nuxt-link
            v-else
            to="https://npmx.dev/package/oxfmt/v/latest"
            target="_blank"
            class="cursor-pointer"
          >
            <UBadge color="warning" size="sm" class="font-bold rounded-sm">Update Available</UBadge>
          </nuxt-link>
        </div>
        <span v-else class="text-neutral-500 mt-4 text-base dark:text-neutral-400">
          Not installed
        </span>

        <div class="flex items-center mt-2" v-if="overview?.oxfmt.installed">
          <UButton
            to="/fmt/config"
            icon="carbon:settings"
            size="sm"
            variant="link"
            trailing-icon
            class="text-neutral-500 dark:text-neutral-400"
          >
            Config
          </UButton>

          <UButton
            to="https://oxc.rs/docs/guide/usage/formatter.html"
            target="_blank"
            icon="carbon:document"
            size="sm"
            variant="link"
            trailing-icon
            class="text-neutral-500 dark:text-neutral-400"
          >
            Docs
          </UButton>
        </div>
      </UCard>
    </div>

    <div class="flex items-center flex-col md:flex-row gap-6">
      <UButton
        to="https://github.com/yuyinws/oxc-inspector"
        target="_blank"
        icon="lucide:star"
        variant="link"
        class="text-neutral-500 dark:text-neutral-400"
      >
        Star on GitHub
      </UButton>
      <UButton
        to="https://github.com/yuyinws/oxc-inspector/discussions/4"
        target="_blank"
        icon="lucide:lightbulb"
        variant="link"
        class="text-neutral-500 dark:text-neutral-400"
      >
        Ideas & Suggestions
      </UButton>

      <UButton
        to="https://github.com/yuyinws/oxc-inspector/issues"
        target="_blank"
        icon="lucide:bug"
        variant="link"
        class="text-neutral-500 dark:text-neutral-400"
      >
        Bug Reports
      </UButton>
    </div>
  </div>
</template>
