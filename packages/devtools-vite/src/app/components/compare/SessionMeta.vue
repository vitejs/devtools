<script setup lang="ts">
defineProps<{
  sessions: Array<{ id: string, createdAt: Date, title: string }>
}>()
</script>

<template>
  <div flex="~ gap5" w-full border="b base" pb3>
    <div v-for="(item) of sessions" :key="item.id" flex-1 border="~ base rounded" p4 grid="~ cols-[max-content_140px_2fr] max-lg:cols-[max-content_80px_2fr] gap-2 items-center">
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
    </div>
  </div>
</template>
