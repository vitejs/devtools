import type { ChannelOptions } from 'birpc'

/**
 * Stable identifier for a peer — persists across reconnects.
 */
export type PeerId = string

/**
 * Well-known and plugin-defined peer roles.
 *
 * Well-known roles are built-in; plugin-defined roles use the `plugin:` prefix.
 * Iframes, workers, and Nitro peers use their own prefixes so consumers can
 * target them by role pattern (e.g. `iframe:*`).
 */
export type PeerRole
  = | 'devtools-server'
    | 'client:embedded'
    | 'client:standalone'
    | 'webext:devtools-panel'
    | `iframe:${string}`
    | `worker:${string}`
    | `nitro:${string}`
    | `plugin:${string}`
    | (string & {})

/**
 * Pattern matching syntax for role queries. `*` matches any suffix within a
 * segment; e.g. `iframe:*` matches `iframe:rolldown` and `iframe:vite`.
 */
export type PeerRolePattern = PeerRole | `${string}:*` | '*'

/**
 * Transport kinds recognized by the mesh.
 *
 * New adapters can extend this with string literals via augmentation.
 */
export type TransportKind
  = | 'ws'
    | 'postmessage'
    | 'broadcastchannel'
    | 'http'
    | 'in-process'
    | 'message-channel'
    | 'comlink-worker'
    | (string & {})

/**
 * Info about a transport link a peer advertises.
 */
export interface TransportLinkInfo {
  transport: TransportKind
  endpoint?: string
  priority: number
}

/**
 * A peer in the mesh — a runtime context (node process, browser tab, iframe,
 * worker, etc.) participating in RPC.
 */
export interface PeerDescriptor {
  id: PeerId
  role: PeerRole
  capabilities: readonly string[]
  meta: Record<string, unknown>
  links: readonly TransportLinkInfo[]
}

/**
 * A query used to find peer(s) by role / capability / meta.
 */
export interface PeerQuery {
  role?: PeerRole | PeerRolePattern
  capability?: string
  meta?: Partial<Record<string, unknown>>
}

/**
 * Propagated authentication context. `originPeerId` and `originIsTrusted`
 * describe the caller; `sig` is an HMAC produced by the devtools-server when
 * a call is relayed through it (so the target can verify origin without
 * trusting intermediaries).
 */
export interface AuthContext {
  originPeerId: PeerId
  originIsTrusted: boolean
  sig?: string
  method?: string
}

/**
 * Routing envelope. Every cross-peer RPC message in routing mode is wrapped
 * in an envelope; direct 2-peer links may skip the envelope as an
 * optimization.
 */
export interface Envelope {
  v: 1
  from: PeerId
  to: PeerId | PeerRole | PeerRolePattern
  hops: PeerId[]
  maxHops: number
  corr?: string
  auth: AuthContext
  kind: 'call' | 'event' | 'reply' | 'error' | 'hello' | 'bye' | 'directory-delta'
  payload: unknown
}

/**
 * The handshake frame a peer sends when establishing a link.
 */
export interface HelloFrame {
  v: 1
  self: PeerDescriptor
  authToken?: string
}

/**
 * Lifecycle of a link established by a transport adapter.
 */
export interface LinkChannel {
  channel: ChannelOptions
  close: () => void
  meta?: Record<string, unknown>
}

/**
 * Argument passed to a transport adapter when establishing a link.
 */
export interface TransportConnectArgs {
  remote: PeerDescriptor
  signal?: AbortSignal
}

/**
 * A transport adapter — the pluggable unit that establishes one link between
 * two peers.
 *
 * The mesh calls {@link setup} once after registration; the adapter then
 * creates links and attaches them to the mesh. Adapters may also be invited
 * to establish a new link on-demand via {@link connect}.
 */
export interface TransportAdapter {
  readonly kind: TransportKind
  /**
   * Called once when the adapter is registered with a mesh.
   *
   * The adapter typically spins up its infrastructure here (e.g. WS server,
   * postMessage listener) and attaches links to the mesh as they arrive.
   */
  setup?: (ctx: TransportAdapterContext) => void | Promise<void>
  /**
   * Called when the adapter is disposed.
   */
  dispose?: () => void | Promise<void>
  /**
   * Optionally implemented: initiate a new link to a specific remote.
   */
  connect?: (args: TransportConnectArgs) => Promise<LinkChannel>
  /**
   * Whether this adapter can serve the given peer pair.
   */
  canServe?: (local: PeerDescriptor, remote: PeerDescriptor) => boolean
}

/**
 * Context passed to an adapter's {@link TransportAdapter.setup}.
 *
 * Defined here as a `Record` to avoid a circular dependency with
 * `mesh.ts` / `link.ts`; concretely it is a {@link PeerMesh} with
 * {@link PeerMesh.attachLink} exposed.
 */
export interface TransportAdapterContext {
  self: PeerDescriptor
  attachLink: (link: import('./link').Link) => void
  directory: {
    list: () => PeerDescriptor[]
    get: (id: PeerId) => PeerDescriptor | undefined
  }
}

/**
 * Events emitted by the mesh.
 */
export interface PeerMeshEvents {
  'peer:connected': (peer: PeerDescriptor) => void
  'peer:disconnected': (id: PeerId) => void
  'peer:updated': (peer: PeerDescriptor) => void
}

/**
 * A consumer-facing handle to a peer. Calls made through the handle are
 * routed to the target peer via the best available link.
 */
export interface PeerHandle<Functions extends Record<string, (...args: any[]) => any> = Record<string, (...args: any[]) => any>> {
  readonly descriptor: PeerDescriptor
  readonly isDirect: boolean
  call: <M extends keyof Functions>(method: M, ...args: Parameters<Functions[M]>) => Promise<Awaited<ReturnType<Functions[M]>>>
  callEvent: <M extends keyof Functions>(method: M, ...args: Parameters<Functions[M]>) => void
  callOptional: <M extends keyof Functions>(method: M, ...args: Parameters<Functions[M]>) => Promise<Awaited<ReturnType<Functions[M]>> | undefined>
}
