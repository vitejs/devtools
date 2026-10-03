import type { DevframeNodeContext } from 'devframe/types'
import { createDefineWrapperWithContext } from 'devframe/rpc'

/**
 * `defineRpcFunction` pre-bound to the framework-neutral
 * {@link DevframeNodeContext}, so each oxc function's `setup(ctx)` receives
 * the portable node context (`ctx.rpc`, `ctx.cwd`, …) instead of assuming the
 * Vite-augmented kit context. This keeps the functions runnable both embedded
 * in Vite DevTools and standalone under devframe's CLI.
 */
export const defineOxcRpc = createDefineWrapperWithContext<DevframeNodeContext>()
