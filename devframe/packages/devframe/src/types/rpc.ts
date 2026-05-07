import type { BirpcReturn } from 'birpc'
import type { RpcFunctionsCollectorBase } from 'devframe/rpc'
import type { DevToolsNodeRpcSessionMeta } from 'devframe/rpc/transports/ws-server'
import type { SharedState } from '../utils/shared-state'
import type { StreamReader, StreamSink } from '../utils/streaming-channel'
import type { DevToolsNodeContext } from './context'
import type { DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, DevToolsRpcSharedStates } from './rpc-augments'

export type { DevToolsNodeRpcSessionMeta }

export interface DevToolsNodeRpcSession {
  meta: DevToolsNodeRpcSessionMeta
  rpc: BirpcReturn<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, false>
}

export interface RpcBroadcastOptions<METHOD, Args extends any[]> {
  method: METHOD
  args: Args
  optional?: boolean
  event?: boolean
  filter?: (client: BirpcReturn<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, false>) => boolean | void
}

export type RpcFunctionsHost = RpcFunctionsCollectorBase<DevToolsRpcServerFunctions, DevToolsNodeContext> & {
  /**
   * Invoke a locally registered server RPC function directly.
   *
   * This bypasses transport and is useful for server-side cross-function calls.
   */
  invokeLocal: <
    T extends keyof DevToolsRpcServerFunctions,
    Args extends Parameters<DevToolsRpcServerFunctions[T]>,
  >(
    method: T,
    ...args: Args
  ) => Promise<Awaited<ReturnType<DevToolsRpcServerFunctions[T]>>>

  /**
   * Broadcast a message to all connected clients
   */
  broadcast: <
    T extends keyof DevToolsRpcClientFunctions,
    Args extends Parameters<DevToolsRpcClientFunctions[T]>,
  >(
    options: RpcBroadcastOptions<T, Args>,
  ) => Promise<void>

  /**
   * Get the current RPC client
   *
   * Available in RPC functions to get the current RPC client
   */
  getCurrentRpcSession: () => DevToolsNodeRpcSession | undefined

  /**
   * The shared state host
   */
  sharedState: RpcSharedStateHost

  /**
   * The streaming channel host. Provides per-channel `start()` /
   * `pipeFrom()` producers; clients consume via `rpc.streaming.subscribe()`.
   *
   * @see RpcStreamingHost
   */
  streaming: RpcStreamingHost
}

export interface RpcSharedStateGetOptions<T> {
  sharedState?: SharedState<T>
  initialValue?: T
}

export interface RpcSharedStateHost {
  get: <T extends keyof DevToolsRpcSharedStates>(key: T, options?: RpcSharedStateGetOptions<DevToolsRpcSharedStates[T]>) => Promise<SharedState<DevToolsRpcSharedStates[T]>>
  keys: () => string[]
  /**
   * Subscribe to new shared-state keys becoming available. Fires when
   * `get(key, ...)` creates a fresh entry (not on subsequent gets).
   * Useful for protocol adapters (e.g. MCP) that surface shared state
   * as dynamic resources.
   */
  onKeyAdded: (fn: (key: string) => void) => () => void
}

/**
 * Options for `RpcStreamingHost.create()`.
 */
export interface RpcStreamingChannelOptions {
  /**
   * Size of the per-stream ring buffer kept on the server for
   * replay-on-resubscribe. `0` (default) disables replay; on reconnect
   * the consumer only sees chunks that arrive after subscribing.
   *
   * The buffer is per stream id, not per channel — each `channel.start()`
   * gets its own.
   */
  replayWindow?: number
  /**
   * Milliseconds a closed stream is retained on the server after its
   * last subscriber leaves (or if no subscriber ever arrived). During
   * this window, late subscribers can still join and replay the buffer
   * + receive the `end` frame.
   *
   * Defaults to `30_000` (30 s) when `replayWindow > 0`, else `0`
   * (immediate free). Set to `0` to opt out, or higher for longer
   * post-mortem replay.
   */
  closedStreamRetention?: number
}

/**
 * Channel handle returned by `ctx.rpc.streaming.create(name, opts)`. A
 * channel owns a wire namespace; calling `start()` produces individual
 * streams keyed by id.
 *
 * @see {@link https://devfra.me/guide/streaming Streaming guide}
 */
export interface RpcStreamingChannel<T = unknown> {
  /** Channel name as registered with `ctx.rpc.streaming.create()`. */
  readonly name: string
  /**
   * Start a new stream. Returns a server-side sink with both an imperative
   * (`write` / `close` / `error`) surface and a `WritableStream<T>` for
   * `pipeTo` consumption. The sink's `signal` aborts when every subscriber
   * disconnects or cancels.
   */
  start: (opts?: { id?: string }) => StreamSink<T>
  /**
   * Convenience: start a stream and pipe a `ReadableStream<T>` into it.
   * The pipe uses `sink.signal` so cancellation propagates upstream.
   *
   * Node-stream interop: convert a `Readable` with `Readable.toWeb(node)`
   * before passing it here.
   */
  pipeFrom: (readable: ReadableStream<T>, opts?: { id?: string }) => Promise<StreamSink<T>>
  /** Look up an active stream by id. Returns `undefined` if none. */
  get: (id: string) => StreamSink<T> | undefined
  /** All active outbound stream ids on this channel. */
  ids: () => string[]
  /**
   * Open an inbound stream — the server side of a client-to-server
   * upload. Allocates an id, returns a `StreamReader<T>` that fills as
   * the client writes chunks. Typical pattern is to call this from an
   * action handler, kick off background processing, and return the id
   * so the caller can start uploading:
   *
   * ```ts
   * handler: async () => {
   *   const reader = channel.openInbound()
   *   ;(async () => {
   *     for await (const chunk of reader) processChunk(chunk)
   *   })()
   *   return { uploadId: reader.id }
   * }
   * ```
   *
   * Calling `reader.cancel()` on the server sends an `upload-cancel` to
   * the uploading client, which aborts its sink.
   */
  openInbound: (opts?: { id?: string }) => StreamReader<T>
}

/**
 * Server-side streaming host. Lives on `ctx.rpc.streaming` alongside
 * `ctx.rpc.sharedState`. Each named channel owns its own stream registry
 * and wire namespace.
 */
export interface RpcStreamingHost {
  /**
   * Register a streaming channel. Names follow the `<plugin-id>:<channel>`
   * convention (e.g. `'my-devtool:chat-stream'`). Throws `DF0032` if the
   * name is already taken.
   */
  create: <T = unknown>(name: string, opts?: RpcStreamingChannelOptions) => RpcStreamingChannel<T>
  /**
   * Adapters call this when a session disconnects so the host can drop
   * subscribers and abort orphaned streams. Most users do not need this;
   * it's wired by `startHttpAndWs` automatically.
   *
   * @internal
   */
  _onSessionDisconnected: (meta: DevToolsNodeRpcSessionMeta) => void
}
