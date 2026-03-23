<script setup lang="ts">
import { formatKeybinding } from '../../state/keybindings'

const props = defineProps<{
  keyString: string
}>()

const keys = formatKeybinding(props.keyString)
</script>

<template>
  <span class="flex items-center gap-0.5">
    <kbd
      v-for="(key, j) in keys"
      :key="j"
      class="px-1.5 py-0.5 text-[10px] rounded bg-base border border-base op60 font-mono"
    >
      {{ key }}
    </kbd>
  </span>
</template>
