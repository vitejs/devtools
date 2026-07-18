<script setup lang="ts">
export interface CompareSessionSummaryItem {
  label: string
  value: string
  icon: string
  tone?: 'increase' | 'decrease'
}

defineProps<{
  sessions: Array<{ id: string, createdAt: Date, title: string }>
  summaries?: CompareSessionSummaryItem[][]
}>()
</script>

<template>
  <div class="flex gap5 w-full border-b border-base pb3">
    <div v-for="(item, index) of sessions" :key="item.id" class="flex-1 border border-base rounded p4 grid grid-cols-[max-content_140px_2fr] max-lg:grid-cols-[max-content_80px_2fr] gap-2 items-center">
      <!-- session meta -->
      <div class="i-ph-hash-duotone" />
      <div>
        {{ item.title }}
      </div>
      <div class="font-mono">
        <span>{{ item.id }}</span>
      </div>
      <!-- created at meta -->
      <div class="i-ph-clock-duotone" />
      <div>
        Created At
      </div>
      <div class="font-mono">
        <time :datetime="item.createdAt.toISOString()">{{ item.createdAt.toLocaleString() }}</time>
      </div>

      <div v-if="summaries?.[index]?.length" class="col-span-3 border-t border-base mt2 pt3 flex items-center gap-4 flex-wrap">
        <div v-for="summary of summaries?.[index] || []" :key="summary.label" class="flex items-center gap-2">
          <div :class="summary.icon" class="op50" />
          <div class="text-xs op50">
            {{ summary.label }}
          </div>
          <div
            class="font-mono font-600"
            :class="summary.tone === 'increase' ? 'text-red-500' : summary.tone === 'decrease' ? 'text-green-500' : undefined"
          >
            {{ summary.value }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
