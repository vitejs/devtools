<script setup lang="ts">
withDefaults(defineProps<{
  expandable?: boolean
  classRootNode?: string
  activeStart?: boolean
  activeEnd?: boolean
  showTail?: boolean
}>(), {
  showTail: true,
})

const expanded = defineModel<boolean>('expanded', { required: false, default: true })
</script>

<template>
  <FlowmapNode
    v-model:expanded="expanded"
    :lines="{ top: true, bottom: !expandable || !expanded }" pl6 pt4
    :class-node-outer="classRootNode"
    :active="activeStart"
  >
    <template #content>
      <slot name="node" />
    </template>

    <template v-if="expandable" #inline-before>
      <button
        w-6 h-6 mr1 ml--7 mya rounded-full hover="bg-active" flex="~ items-center justify-center" cursor-pointer
        @click="expanded = !expanded"
      >
        <div i-ph-caret-right text-sm op50 transition duration-300 :class="{ 'rotate-90': expanded }" />
      </button>
    </template>

    <template v-if="expandable && expanded" #after>
      <div>
        <svg
          ml-1em w-27px h-30px
          viewBox="0 0 27 30" fill="none" xmlns="http://www.w3.org/2000/svg"
          :class="activeStart ? 'fg-flow-line-active' : 'fg-flow-line'"
        >
          <g>
            <path d="M0.5 0C0.5 18 26.5 12 26.5 30" stroke="currentColor" stroke-width="1px" />
          </g>
        </svg>
        <div ml-2px>
          <slot name="container" />
        </div>
        <svg
          v-if="showTail"
          ml-1em w-27px h-30px
          style="transform: scaleX(-1)" viewBox="0 0 27 30" fill="none"
          xmlns="http://www.w3.org/2000/svg"
          :class="activeEnd ? 'fg-flow-line-active' : 'fg-flow-line'"
        >
          <g>
            <path d="M0.5 0C0.5 18 26.5 12 26.5 30" stroke="currentColor" stroke-width="1px" />
          </g>
        </svg>
      </div>
    </template>
  </FlowmapNode>
</template>
