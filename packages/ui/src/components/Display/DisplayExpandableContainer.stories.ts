import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DisplayExpandableContainer from './DisplayExpandableContainer.vue'

const meta = {
  title: 'Display/DisplayExpandableContainer',
} satisfies Meta

export default meta

export const LongList: StoryObj<{ list: string[] }> = {
  args: { list: Array.from({ length: 48 }, (_, i) => `module-${i + 1}.js`) },
  render: args => ({
    components: { DisplayExpandableContainer },
    setup: () => ({ args }),
    template: `
      <DisplayExpandableContainer v-bind="args" v-slot="{ items }">
        <div v-for="item in items" :key="item" class="px2 py1 font-mono">{{ item }}</div>
      </DisplayExpandableContainer>`,
  }),
}
