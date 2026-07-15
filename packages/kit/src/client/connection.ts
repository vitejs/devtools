import type { DevframeRpcClient, DevframeRpcClientOptions } from '@devframes/hub/client'
import { getDevframeRpcClient } from '@devframes/hub/client'

// The global key devframe's client publishes the connection meta under, so a
// same-origin embedded SPA can inherit it from `parent.window` instead of
// fetching its own `__connection.json`. Kept in sync with devframe's client
// (it is a private constant there, not re-exported).
const CONNECTION_META_KEY = '__DEVFRAME_CONNECTION_META__'

/**
 * Rewrite a route-bound (relative-path) websocket descriptor to an absolute,
 * origin-resolved path, using the base the parent client loaded its
 * `__connection.json` from. Returns the meta unchanged for the port/string
 * forms (already origin-absolute) or when resolution isn't possible.
 *
 * Why: Vite DevTools mounts each devframe (Terminals, the Inspector, …) as a
 * same-origin iframe at its own base (e.g. `/__devframes-plugin-terminals/`).
 * devframe's client checks `parent.window[CONNECTION_META_KEY]` *before*
 * fetching, so the child inherits this meta — but it then resolves a relative
 * `websocket.path` against its *own* base, dialing the wrong endpoint. Publishing
 * an absolute path (resolved against the parent's mount, so proxy prefixes are
 * preserved) lets every same-origin child inherit a dialable endpoint.
 */
function toBaseIndependentMeta(
  meta: DevframeRpcClient['connectionMeta'],
  baseURL: string | string[] | undefined,
): DevframeRpcClient['connectionMeta'] {
  const ws = meta.websocket
  if (!ws || typeof ws !== 'object' || ws.path == null || ws.host != null || ws.port != null)
    return meta
  const href = globalThis.location?.href
  if (!href)
    return meta
  try {
    const base = (Array.isArray(baseURL) ? baseURL[0] : baseURL) ?? './'
    // Resolve `__ws` against the parent's `__connection.json` location so the
    // result carries any reverse-proxy path prefix, then keep just the
    // absolute path (same-origin; protocol/host are re-derived by the client).
    const metaBase = new URL('__connection.json', new URL(base, href))
    const abs = new URL(ws.path, metaBase)
    return { ...meta, websocket: { ...ws, path: abs.pathname + abs.search } }
  }
  catch {
    return meta
  }
}

/**
 * The Vite DevTools flavour of devframe's {@link getDevframeRpcClient}. Behaves
 * identically, then republishes the connection meta on the shared window with a
 * base-independent websocket endpoint, so the same-origin devframe iframes Vite
 * DevTools mounts at other base paths inherit a dialable descriptor.
 */
export async function getDevToolsRpcClient(
  options: DevframeRpcClientOptions = {},
): Promise<DevframeRpcClient> {
  const client = await getDevframeRpcClient(options)
  try {
    const normalized = toBaseIndependentMeta(client.connectionMeta, options.baseURL)
    if (normalized !== client.connectionMeta) {
      (globalThis as Record<string, unknown>)[CONNECTION_META_KEY] = normalized
    }
  }
  catch {}
  return client
}
