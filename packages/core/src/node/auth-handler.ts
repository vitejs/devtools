import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import process from 'node:process'
import { createInteractiveAuth } from 'devframe/recipes/interactive-auth'
import { getResolvedDevToolsConfig } from './resolved-config'

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
    const config = getResolvedDevToolsConfig(context).config
    handler = createInteractiveAuth(context, {
      clientAuthTokens: config.clientAuthTokens,
      banner: config.banner,
    })
    handlers.set(context, handler)
  }
  return handler
}

/**
 * Whether the interactive OTP gate should stay off for this context — a
 * build snapshot (nothing live to authorize against), an explicit
 * `devtools: { clientAuth: false }`, or the `VITE_DEVTOOLS_DISABLE_CLIENT_AUTH`
 * escape-hatch env var. Shared between `createDevToolsContext` (which must
 * skip registering the interactive-auth RPC functions so devframe's
 * `auth: false` auto-trust shim can register `anonymous:devframe:auth`
 * itself) and `createDevToolsHub` (which feeds the same intent to
 * `initHub`'s transport-level `auth` option) — both need to agree, or the
 * client's session never gets marked trusted.
 */
export function isClientAuthDisabled(context: ViteDevToolsNodeContext): boolean {
  return context.mode === 'build'
    || getResolvedDevToolsConfig(context).config.clientAuth === false
    || process.env.VITE_DEVTOOLS_DISABLE_CLIENT_AUTH === 'true'
}
