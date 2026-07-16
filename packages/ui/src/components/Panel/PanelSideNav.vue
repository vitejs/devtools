<script setup lang="ts">
import type { SideNavItem } from '../../composables/nav'
import { computed } from 'vue'
import { NuxtLink } from '#components'
import { sideNavItems } from '../../composables/nav'

const props = defineProps<{
  items?: SideNavItem[]
}>()

const items = computed<SideNavItem[]>(() => {
  const navItems = props.items ?? sideNavItems.value
  return navItems
})
</script>

<template>
  <div w12 flex-none>
    <Teleport to="body">
      <div
        border="r y base rounded-r-xl" flex="~ col gap-1" p1 of-y-auto max-h-96vh bg-glass
        style="position: fixed; left: 0; top: 50%; transform: translateY(-50%); z-index: 64"
      >
        <template v-for="item in items" :key="item.title">
          <component
            :is="item.to ? NuxtLink : 'button'"
            v-bind="item.to ? { to: item.to } : { type: 'button' }"
            v-tooltip="{ placement: 'right', content: item.title }"
            :title="item.title"
            :aria-label="item.title"
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
    </Teleport>
  </div>
</template>
