import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { DevToolsViewLauncher } from '@vitejs/devtools-kit'
import { h } from 'vue'
import { mountWithContext } from '../../stories/story-helpers'
import ViewLauncher from './ViewLauncher.vue'

function launcher(status: 'idle' | 'loading' | 'error' | 'success'): DevToolsViewLauncher {
  return {
    id: 'launcher',
    type: 'launcher',
    title: 'Launcher',
    icon: 'ph:rocket-launch-duotone',
    launcher: {
      title: 'Launch My Cool App',
      description: 'Start the dev server and open it here.',
      status,
    },
  } as DevToolsViewLauncher
}

function stage(children: any) {
  return h('div', { class: 'h-100 bg-base color-base border border-base rounded-lg overflow-hidden font-sans' }, children)
}

const meta = {
  title: 'Views/Launcher',
  component: ViewLauncher,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A launcher view: a call-to-action that runs the entry\'s `onLaunch` and reflects idle / loading / success / error status.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

function launcherStory(status: 'idle' | 'loading' | 'error' | 'success'): Story {
  return {
    render: () => ({
      setup: () => mountWithContext({}, ctx => stage(h(ViewLauncher, { context: ctx, entry: launcher(status) }))),
    }),
  }
}

export const Idle: Story = launcherStory('idle')
export const Loading: Story = launcherStory('loading')
export const Success: Story = launcherStory('success')
export const Error: Story = launcherStory('error')
