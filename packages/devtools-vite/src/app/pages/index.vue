<script setup lang="ts">
import { ref } from 'vue'

const sessionMode = ref<'list' | 'compare'>('list')

const modeList = [
  {
    label: 'Session List',
    icon: 'i-carbon-list',
    value: 'list',
  },
  {
    label: 'Session Compare',
    icon: 'i-carbon-compare',
    value: 'compare',
  },
] as const
</script>

<template>
  <div p4 flex="~ col gap-4" items-center justify-center relative>
    <VisualLogoBanner />
    <p flex="~ row justify-around" w20 h8 border="~ base rounded-8" of-hidden absolute top-5 right-5>
      <button v-for="mode in modeList" :key="mode.value" :title="mode.label" flex-1 op50 cursor-pointer flex="~ items-center justify-center" :class="{ 'bg-active text-white op100!': sessionMode === mode.value }" hover="bg-active text-white op100!" @click="sessionMode = mode.value">
        <span :class="mode.icon" class="text-sm" />
      </button>
    </p>
    <p op50>
      {{ sessionMode === 'list' ? 'Select a build session to get started:' : 'Select 2 sessions to compare:' }}
    </p>
    <PanelSessionSelector :session-mode="sessionMode" />
  </div>
</template>
