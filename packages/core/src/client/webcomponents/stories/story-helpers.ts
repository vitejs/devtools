import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { CreateMockContextOptions } from './mock-context'
import { defineComponent, h, Suspense } from 'vue'
import { createMockDocksContext } from './mock-context'

/**
 * Render a component tree that needs a live {@link DocksContext}.
 *
 * `createMockDocksContext` is async (it boots the real dock context over a mock
 * transport), so we resolve it inside an async `setup` wrapped in `<Suspense>`.
 * The returned value is a render function — drop it straight into a story's
 * `setup`:
 *
 * ```ts
 * export const Example: Story = {
 *   render: () => ({
 *     setup: () => mountWithContext(
 *       { entries: groupedEntries },
 *       ctx => h(SomeComponent, { context: ctx }),
 *     ),
 *   }),
 * }
 * ```
 */
export function mountWithContext(
  options: CreateMockContextOptions,
  slot: (context: DocksContext) => unknown,
): () => unknown {
  const Inner = defineComponent({
    name: 'MockContextProvider',
    async setup() {
      const context = await createMockDocksContext(options)
      return () => slot(context) as any
    },
  })

  return () => h(
    Suspense,
    null,
    {
      default: () => h(Inner),
      fallback: () => h('div', { class: 'p8 op50 font-sans' }, 'Loading…'),
    },
  )
}

/**
 * Wrap story content in a centered, padded stage. Handy for the smaller
 * presentational pieces (entries, popovers, sidebars) that would otherwise sit
 * flush against the canvas edge.
 */
export function stage(children: unknown, extraClass = ''): unknown {
  return h(
    'div',
    { class: `flex items-center justify-center p10 min-h-60 ${extraClass}` },
    children as any,
  )
}
