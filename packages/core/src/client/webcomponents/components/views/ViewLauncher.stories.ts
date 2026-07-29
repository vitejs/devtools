import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { DevToolsViewLauncher } from '@vitejs/devtools-kit'
import { h } from 'vue'
import { mountWithContext } from '../../stories/story-helpers'
import ViewLauncher from './ViewLauncher.vue'

function launcher(
  status: 'idle' | 'loading' | 'error' | 'success',
  extras: Partial<DevToolsViewLauncher['launcher']> = {},
): DevToolsViewLauncher {
  return {
    id: 'launcher',
    type: 'launcher',
    title: 'Launcher',
    icon: 'ph:rocket-launch-duotone',
    launcher: {
      title: 'Launch My Cool App',
      description: 'Start the dev server and open it here.',
      status,
      ...extras,
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

function launcherStory(
  status: 'idle' | 'loading' | 'error' | 'success',
  extras: Partial<DevToolsViewLauncher['launcher']> = {},
): Story {
  return {
    render: () => ({
      setup: () => mountWithContext({}, ctx => stage(h(ViewLauncher, { context: ctx, entry: launcher(status, extras) }))),
    }),
  }
}

export const Idle: Story = launcherStory('idle')
export const Loading: Story = launcherStory('loading')
export const Success: Story = launcherStory('success')

// A failed launch surfaces the reason and offers a clickable Retry.
export const Error: Story = launcherStory('error', {
  error: 'No test files found, exiting with code 1',
})

// A launcher tracking a terminal session: it shows the process's progress and
// offers to jump to that session in the Terminals dock.
export const WithProgress: Story = launcherStory('loading', {
  buttonLoading: 'Starting…',
  terminalSessionId: 'my-app:dev',
  digest: 'Waiting for the server…',
})
