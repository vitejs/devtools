<script setup lang="ts">
import type { PluginItem } from '~~/shared/types'

defineProps<{
  plugins: PluginItem[]
}>()
</script>

<template>
  <div flex="~ col gap-2" p4>
    <template v-for="plugin of plugins" :key="plugin.id">
      <div font-mono border="~ rounded base" px2 py1 text-sm hover="bg-active">
        <DisplayPluginName :name="plugin.name" />
      </div>
    </template>
  </div>
</template>
