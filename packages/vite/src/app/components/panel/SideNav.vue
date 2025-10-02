<script setup lang="ts">
import type { SideNavItem } from '~/state/nav'
import { NuxtLink } from '#components'
import { computed } from 'vue'
import { sideNavItems } from '~/state/nav'

const items = computed<SideNavItem[]>(() => [
  ...sideNavItems.value,
  {
    title: 'Toggle dark mode',
    icon: 'i-ph-sun-duotone dark:i-ph-moon-duotone',
    action: toggleDark,
  },
])
</script>

<template>
  <div>
    <div
      border="r y base rounded-r-xl" flex="~ col gap-1" p1 of-y-auto max-h-96vh relative bg-glass
      class="fixed left-0 top-1/2 -translate-y-1/2"
    >
      <template v-for="item in items" :key="item.title">
        <component
          :is="item.to ? NuxtLink : 'button'"
          v-bind="item.to ? { to: item.to } : {}"
          v-tooltip="{ placement: 'right', content: item.title }"
          :title="item.title"
          rounded-full
          p2 hover:bg-active op-fade hover:op100
          flex="~ items-center justify-center"
          exact-active-class="text-primary op100!"
          @click="item.action?.()"
        >
          <div :class="item.icon" text-lg />
        </component>
      </template>
    </div>
  </div>
</template>
