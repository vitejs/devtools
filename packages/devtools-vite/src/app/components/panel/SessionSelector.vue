<script setup lang="ts">
import { useRpc } from '#imports'

const rpc = useRpc()
const sessions = await rpc.value!['vite:rolldown:list-sessions']()
</script>

<template>
  <div flex="~ col gap-2">
    <NuxtLink
      v-for="session of sessions"
      :key="session.id"
      :to="`/session/${session.id}`"
      hover="bg-active"
      border="~ base rounded-md"
      flex="~ col gap-1"
      px4 py3
    >
      <div flex="~ gap-1 items-center" font-mono op50 text-sm>
        <div i-ph-hash-duotone />
        {{ session.id }}
      </div>
      <div font-mono font-sm>
        {{ session.meta.cwd }}
      </div>
      <div v-if="session.meta.inputs[0]" flex="~ gap-1 items-center">
        <DisplayModuleId :id="session.meta.inputs[0].filename" :cwd="session.meta.cwd" />
        <DisplayBadge :text="session.meta.inputs[0].name || 'entry'" />
        <span v-if="session.meta.inputs.length > 1" op50 text-xs border="~ base rounded-md" px1 font-mono>
          +{{ session.meta.inputs.length - 1 }}
        </span>
      </div>
      <DisplayTimestamp :timestamp="session.timestamp" pt2 text-sm op50 />
    </NuxtLink>
  </div>
</template>
