<script setup lang="ts">
export interface CompareSessionSummaryItem {
  label: string
  value: string
  icon: string
}

defineProps<{
  sessions: Array<{ id: string, createdAt: Date, title: string }>
  summaries?: CompareSessionSummaryItem[][]
}>()
</script>

<template>
  <div flex="~ gap5" w-full border="b base" pb3>
    <div v-for="(item, index) of sessions" :key="item.id" flex-1 border="~ base rounded" p4 grid="~ cols-[max-content_140px_2fr] max-lg:cols-[max-content_80px_2fr] gap-2 items-center">
      <!-- session meta -->
      <div class="i-ph-hash-duotone" />
      <div>
        {{ item.title }}
      </div>
      <div font-mono>
        <span>{{ item.id }}</span>
      </div>
      <!-- created at meta -->
      <div class="i-ph-clock-duotone" />
      <div>
        Created At
      </div>
      <div font-mono>
        <time :datetime="item.createdAt.toISOString()">{{ item.createdAt.toLocaleString() }}</time>
      </div>

      <div v-if="summaries?.[index]?.length" col-span-3 border="t base" mt2 pt3 flex="~ items-center gap-4 wrap">
        <div v-for="summary of summaries?.[index] || []" :key="summary.label" flex="~ items-center gap-2">
          <div :class="summary.icon" op50 />
          <div text-xs op50>
            {{ summary.label }}
          </div>
          <div font-mono font-600>
            {{ summary.value }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
