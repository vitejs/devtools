import type {
  RpcFunctionDefinitionAny,
  RpcFunctionDefinitionAnyWithContext,
} from 'devframe/rpc'
import type {
  RpcGeneratorStreamContext,
  RpcStreamingChannel,
  RpcStreamingHost,
} from 'devframe/types'
import type { RpcFunctionsHost } from './host-functions'
import { AsyncLocalStorage } from 'node:async_hooks'
import process from 'node:process'
import * as v from 'valibot'
import { logger as rpcLogger } from '../rpc/diagnostics'
import { logger } from './diagnostics'

/**
 * Hidden channel name used by every `type: 'generator'` RPC. One channel
 * per host; per-stream replay buffers are sized via the function-level
 * `replayWindow` option. Internal — kept in lockstep with the client-side
 * constant in `client/rpc-generators.ts`.
 *
 * @internal
 */
const GENERATOR_CHANNEL = 'devframe:rpc:generators'

/**
 * Generator handlers reach the active stream's `signal` / `streamId` /
 * `session` via this AsyncLocalStorage.
 */
const rpcGeneratorAsyncStorage = new AsyncLocalStorage<RpcGeneratorStreamContext>()

/**
 * Inside a `type: 'generator'` RPC handler, returns the active stream
 * context (signal for cooperative cancellation, the server-allocated
 * `streamId`, and the originating session). Returns `undefined` when
 * called outside a generator handler.
 *
 * Mirrors `getCurrentRpcSession()` — same AsyncLocalStorage pattern.
 */
export function getCurrentRpcStream(): RpcGeneratorStreamContext | undefined {
  return rpcGeneratorAsyncStorage.getStore()
}

/**
 * Internal envelope returned by the auto-generated `'action'` wrapper
 * that replaces a user's `type: 'generator'` definition. The client host
 * unwraps this and `streaming.subscribe()`s on the user's behalf.
 *
 * @internal
 */
export interface RpcGeneratorEnvelope {
  __generator: true
  streamId: string
}

/**
 * Wires `type: 'generator'` RPC functions onto the existing streaming
 * channel transport. Wraps `rpc.register` so generator definitions are
 * intercepted at registration time and replaced with an auto-generated
 * `'action'` wrapper that returns `{ __generator: true, streamId }`.
 *
 * The original generator handler is preserved on the wrapper as
 * `__generatorOriginalHandler` for `invokeLocalGenerator` to reach
 * directly without traversing the transport.
 */
export function attachRpcGenerators(rpc: RpcFunctionsHost, streaming: RpcStreamingHost): void {
  let channel: RpcStreamingChannel<unknown> | undefined

  function ensureChannel(): RpcStreamingChannel<unknown> {
    if (!channel) {
      // 256-chunk default protects against the client-subscribe-vs-first-yield
      // race; per-call overrides come from `def.replayWindow` on `start()`.
      channel = streaming.create(GENERATOR_CHANNEL, { replayWindow: 256 })
    }
    return channel
  }

  const originalRegister = rpc.register.bind(rpc)
  rpc.register = ((def: RpcFunctionDefinitionAnyWithContext<any>, force?: boolean): void => {
    if ((def as any).type !== 'generator') {
      return originalRegister(def as RpcFunctionDefinitionAny, force)
    }

    validateGeneratorDefinition(def as any)

    const ch = ensureChannel()
    const userHandler = (def as any).handler as ((...args: any[]) => AsyncIterable<any>) | undefined
    const userSetup = (def as any).setup as ((ctx: any) => any) | undefined
    const yields = (def as any).yields as v.GenericSchema | undefined
    const replayWindow = Math.max(1, (def as any).replayWindow ?? 256)

    const wrapper: RpcFunctionDefinitionAnyWithContext<any> = {
      name: def.name,
      type: 'action',
      // No args/returns/jsonSerializable on the wrapper — we encode the
      // envelope through structured-clone (default) so it round-trips
      // even if the user's yields aren't JSON-safe. Args validation, if
      // declared, was already attached to the original def's `args` and
      // we don't re-run it here (birpc resolves through the wrapper).
      handler: (async (...args: any[]) => {
        // Resolve handler if it was supplied via setup()
        const handler = userHandler ?? await resolveSetupHandler(rpc, def, userSetup)
        if (!handler) {
          throw rpcLogger.DF0024({ name: def.name }).throw()
        }

        const session = safeGetCurrentSession(rpc)
        const sink = ch.start({ replayWindow })
        const ctx: RpcGeneratorStreamContext = {
          signal: sink.signal,
          streamId: sink.id,
          session,
        }

        // Kick off the producer in a microtask so the wrapper returns
        // the envelope immediately. The replay buffer absorbs early
        // yields before the client subscribe lands.
        queueMicrotask(() => {
          void runGenerator(def.name, handler, args, sink, ctx, yields)
        })

        return { __generator: true, streamId: sink.id } satisfies RpcGeneratorEnvelope
      }) as any,
    }
    // Preserve the original handler for invokeLocalGenerator() — it lets
    // server-side callers iterate the generator directly without paying
    // for the streaming round-trip.
    ;(wrapper as any).__generatorOriginalDef = def
    ;(wrapper as any).__generatorOriginalHandler = userHandler
    ;(wrapper as any).__generatorOriginalSetup = userSetup

    originalRegister(wrapper, force)
  }) as typeof rpc.register
}

async function resolveSetupHandler(
  rpc: RpcFunctionsHost,
  def: any,
  setup: ((ctx: any) => any) | undefined,
): Promise<((...args: any[]) => AsyncIterable<any>) | undefined> {
  if (!setup)
    return undefined
  if (def.__resolved)
    return def.__resolved.handler
  def.__promise ??= Promise.resolve(setup(rpc.context))
  const result = await def.__promise
  def.__resolved = result
  return result?.handler
}

function safeGetCurrentSession(rpc: RpcFunctionsHost) {
  try {
    return rpc.getCurrentRpcSession()
  }
  catch {
    return undefined
  }
}

async function runGenerator(
  name: string,
  handler: (...args: any[]) => AsyncIterable<any>,
  args: any[],
  sink: { write: (v: any) => void, error: (e: unknown) => void, close: () => void, signal: AbortSignal },
  ctx: RpcGeneratorStreamContext,
  yields: v.GenericSchema | undefined,
): Promise<void> {
  // Bind ALS for the lifetime of the producer. Generator yields and
  // awaits inside the handler body inherit this scope.
  await rpcGeneratorAsyncStorage.run(ctx, async () => {
    try {
      const iter = handler(...args)
      if (!iter || typeof (iter as any)[Symbol.asyncIterator] !== 'function') {
        throw logger.DF0034({ name }).throw()
      }
      const isDev = process.env.NODE_ENV !== 'production'
      for await (const value of iter) {
        if (sink.signal.aborted)
          break
        if (yields && isDev) {
          const result = v.safeParse(yields, value)
          if (!result.success) {
            console.warn(
              `[devframe] Generator "${name}" yielded a value that does not match its \`yields\` schema; forwarding anyway.`,
              { issues: result.issues },
            )
          }
        }
        sink.write(value)
      }
      sink.close()
    }
    catch (err) {
      sink.error(err)
    }
  })
}

function validateGeneratorDefinition(def: any): void {
  if (def.agent) {
    throw logger.DF0033({ name: def.name }).throw()
  }
  if (def.args && !def.yields) {
    throw logger.DF0035({ name: def.name }).throw()
  }
  if (def.cacheable) {
    throw logger.DF0036({ name: def.name, option: 'cacheable: true' }).throw()
  }
  if (def.jsonSerializable === true) {
    throw logger.DF0036({ name: def.name, option: 'jsonSerializable: true' }).throw()
  }
  if (def.dump) {
    throw rpcLogger.DF0027({ name: def.name, type: 'generator' }).throw()
  }
  if (def.snapshot) {
    throw rpcLogger.DF0028({ name: def.name, type: 'generator' }).throw()
  }
}

/**
 * Server-side direct invocation of a generator-typed RPC function.
 * Skips the streaming channel entirely — yields go straight from the
 * user's handler to the caller's `for await`. Useful for cross-function
 * server-side calls where transport overhead is wasted.
 *
 * Returns an `AsyncIterable<Y>`; the caller is responsible for any
 * cancellation or error handling. `getCurrentRpcStream()` returns
 * `undefined` inside locally-invoked generators (no stream id, no signal).
 */
export async function invokeLocalGenerator<Y = unknown>(
  rpc: RpcFunctionsHost,
  name: string,
  ...args: any[]
): Promise<AsyncIterable<Y>> {
  const def = rpc.definitions.get(name) as any
  if (!def) {
    throw logger.DF0006({ name }).throw()
  }
  const original = def.__generatorOriginalHandler
    ?? (def.__generatorOriginalDef && (def.__generatorOriginalDef as any).handler)
  const setup = def.__generatorOriginalSetup
  if (original) {
    return original(...args) as AsyncIterable<Y>
  }
  if (setup && def.__generatorOriginalDef) {
    const handler = await resolveSetupHandler(rpc, def.__generatorOriginalDef, setup)
    if (handler)
      return handler(...args) as AsyncIterable<Y>
  }
  throw rpcLogger.DF0024({ name }).throw()
}
