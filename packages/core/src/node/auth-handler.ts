import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { createInteractiveAuth } from 'devframe/recipes/interactive-auth'

export type DevToolsAuthHandler = ReturnType<typeof createInteractiveAuth>

const handlers = new WeakMap<ViteDevToolsNodeContext, DevToolsAuthHandler>()

/**
 * The interactive OTP auth handler for a context — created once and shared
 * between context setup (which registers its handshake / self-revoke RPC
 * functions) and the WS server (which uses its resolver gate and prints the
 * one-time-code banner). Backed by devframe's `createInteractiveAuth` recipe,
 * so the `anonymous:devframe:auth*` handlers, `devframe:auth:revoke`, and the
 * banner all come from upstream rather than being hand-rolled here.
 */
export function getAuthHandler(context: ViteDevToolsNodeContext): DevToolsAuthHandler {
  let handler = handlers.get(context)
  if (!handler) {
    handler = createInteractiveAuth(context, {
      clientAuthTokens: context.viteConfig.devtools?.config?.clientAuthTokens,
    })
    handlers.set(context, handler)
  }
  return handler
}
