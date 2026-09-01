import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { DevToolsConfig } from './config'
import { randomBytes } from 'node:crypto'
import process from 'node:process'
import { createInteractiveAuth } from 'devframe/recipes/interactive-auth'

export type DevToolsAuthHandler = ReturnType<typeof createInteractiveAuth>

const handlers = new WeakMap<ViteDevToolsNodeContext, DevToolsAuthHandler>()
const capabilityTokens = new WeakMap<ViteDevToolsNodeContext, string>()

/**
 * The per-process capability token minted for an implicit build-mode context
 * (see {@link isBuildCapabilityAuth}). Created lazily and memoized per context,
 * so `getAuthHandler` (which registers it as an always-trusted
 * `clientAuthTokens` entry) and `createDevToolsHub` (which bakes it into the
 * locally-served connection metadata's `authToken`) hand out the exact same
 * value. Unguessable and never printed — only a same-origin client able to read
 * the served `__connection.json` learns it, so a cross-origin loopback page or
 * an `Origin`-less local process stays untrusted.
 */
export function getBuildCapabilityToken(context: ViteDevToolsNodeContext): string {
  let token = capabilityTokens.get(context)
  if (!token) {
    token = randomBytes(32).toString('base64url')
    capabilityTokens.set(context, token)
  }
  return token
}

/**
 * The interactive OTP auth handler for a context — created once and shared
 * between context setup (which registers its handshake / self-revoke RPC
 * functions) and the WS server (which uses its resolver gate and prints the
 * one-time-code banner). Backed by devframe's `createInteractiveAuth` recipe,
 * so the `anonymous:devframe:auth*` handlers, `devframe:auth:revoke`, and the
 * banner all come from upstream rather than being hand-rolled here.
 *
 * In implicit build mode ({@link isBuildCapabilityAuth}) the handler additionally
 * trusts the per-process {@link getBuildCapabilityToken} — the build viewer
 * presents it automatically from the served connection meta — and its OTP
 * banner is suppressed, since trust comes purely from that token.
 */
export function getAuthHandler(context: ViteDevToolsNodeContext): DevToolsAuthHandler {
  let handler = handlers.get(context)
  if (!handler) {
    const config = context.viteConfig.devtools?.config as DevToolsConfig | undefined
    const buildCapability = isBuildCapabilityAuth(context)
    const clientAuthTokens = config?.clientAuthTokens ? [...config.clientAuthTokens] : []
    if (buildCapability)
      clientAuthTokens.push(getBuildCapabilityToken(context))
    handler = createInteractiveAuth(context, {
      clientAuthTokens,
      // Build mode trusts purely via the per-process capability token baked
      // into the served connection meta, so silence the OTP console banner.
      banner: buildCapability ? () => {} : config?.banner,
    })
    handlers.set(context, handler)
  }
  return handler
}

/**
 * Whether the interactive OTP gate stays fully off for this context — an
 * explicit `devtools: { clientAuth: false }` or the
 * `VITE_DEVTOOLS_DISABLE_CLIENT_AUTH` escape-hatch env var. Both are deliberate
 * user opt-outs that trust every accepted client. Shared between
 * `createDevToolsContext` (which then skips registering the interactive-auth
 * RPC functions so devframe's `auth: false` auto-trust shim can register
 * `anonymous:devframe:auth` itself) and `createDevToolsHub` (which feeds the
 * same intent to `initHub`'s transport-level `auth` option) — both need to
 * agree, or the client's session never gets marked trusted.
 *
 * Implicit build mode is deliberately absent: it keeps the auth gate installed
 * but trusts via a capability token instead of a prompt — see
 * {@link isBuildCapabilityAuth}.
 */
export function isClientAuthDisabled(context: ViteDevToolsNodeContext): boolean {
  return context.viteConfig.devtools?.config?.clientAuth === false
    || process.env.VITE_DEVTOOLS_DISABLE_CLIENT_AUTH === 'true'
}

/**
 * Whether this context uses the implicit build-mode capability-token posture:
 * a build snapshot served by a live server (the standalone viewer) that keeps
 * the zero-prompt UX but, instead of trusting all comers, requires the
 * per-process {@link getBuildCapabilityToken}. Only the implicit `build` branch
 * qualifies — the explicit `clientAuth: false` and
 * `VITE_DEVTOOLS_DISABLE_CLIENT_AUTH` opt-outs ({@link isClientAuthDisabled})
 * still disable the gate entirely.
 */
export function isBuildCapabilityAuth(context: ViteDevToolsNodeContext): boolean {
  return context.mode === 'build' && !isClientAuthDisabled(context)
}
