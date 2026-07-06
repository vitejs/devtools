import type { StoryObj } from '@storybook/vue3-vite'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { MockContextOptions } from './mock/create-context'
import {
  setDockContextMenu,
  setDocksGroupPanel,
  setDocksOverflowPanel,
  setEdgePositionDropdown,
  setFloatingTooltip,
} from '../state/floating-tooltip'
import { createMockDocksContext } from './mock/create-context'

/**
 * Clear the module-level floating popover singletons. Stories share one iframe,
 * so reset before each render to stop one story's popover leaking into the next.
 */
export function resetFloatingState(): void {
  setFloatingTooltip(null)
  setDocksOverflowPanel(null)
  setDocksGroupPanel(null)
  setDockContextMenu(null)
  setEdgePositionDropdown(null)
}

export interface ContextStoryConfig {
  /** Options forwarded to {@link createMockDocksContext}. */
  context?: MockContextOptions
  /**
   * Runs after the context is built and floating state is reset, before render.
   * Use it to seed module state (toasts, confirm dialogs, floating popovers).
   */
  prepare?: (context: DocksContext) => void | Promise<void>
  /** Produce the Storybook render result for the resolved context. */
  render: (context: DocksContext, args: Record<string, unknown>) => Record<string, unknown>
}

/**
 * Build a Storybook story whose render depends on an async-built
 * {@link DocksContext}. Resolves the mock context in a loader, resets shared
 * floating state, runs `prepare`, then renders.
 */
export function contextStory(config: ContextStoryConfig): StoryObj {
  return {
    loaders: [
      async () => {
        const mock = await createMockDocksContext(config.context)
        resetFloatingState()
        await config.prepare?.(mock.context)
        return { context: mock.context }
      },
    ],
    render: (args, { loaded }) => config.render((loaded as { context: DocksContext }).context, args as Record<string, unknown>),
  }
}
