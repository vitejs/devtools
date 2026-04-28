import * as v from 'valibot'
import { defineRpcFunction } from '../rpc/define'

/**
 * Prebuilt RPC action that opens a file in the user's configured editor
 * via [`launch-editor`](https://www.npmjs.com/package/launch-editor).
 *
 * Registered name: `devframe:open-in-editor`.
 *
 * ```ts
 * import { openInEditor } from 'devframe/recipes/open-helpers'
 *
 * defineDevtool({
 *   id: 'my-tool',
 *   name: 'My Tool',
 *   setup(ctx) {
 *     ctx.rpc.register(openInEditor)
 *   },
 * })
 * ```
 *
 * Requires `launch-editor` to be installed by the consumer (declared as
 * an optional peer dependency on devframe).
 */
export const openInEditor = defineRpcFunction({
  name: 'devframe:open-in-editor',
  type: 'action',
  args: [v.string()],
  returns: v.void(),
  async handler(filename: string) {
    const mod = await import('launch-editor')
    const launch = (mod as any).default ?? mod
    launch(filename)
  },
})

/**
 * Prebuilt RPC action that reveals a path in the OS file explorer via
 * [`open`](https://www.npmjs.com/package/open).
 *
 * Registered name: `devframe:open-in-finder`.
 *
 * ```ts
 * import { openInFinder } from 'devframe/recipes/open-helpers'
 *
 * ctx.rpc.register(openInFinder)
 * ```
 */
export const openInFinder = defineRpcFunction({
  name: 'devframe:open-in-finder',
  type: 'action',
  args: [v.string()],
  returns: v.void(),
  async handler(path: string) {
    const { default: open } = await import('open')
    await open(path)
  },
})

/**
 * Convenience array bundling both helpers so callers can register them
 * in a single `forEach`.
 *
 * ```ts
 * import { openHelpers } from 'devframe/recipes/open-helpers'
 *
 * openHelpers.forEach(fn => ctx.rpc.register(fn))
 * ```
 */
export const openHelpers = [openInEditor, openInFinder] as const
