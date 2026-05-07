import type { StreamReader } from 'devframe/utils/streaming-channel'
import type { DevToolsRpcClient } from './rpc'

/**
 * Hidden channel name used by every `type: 'generator'` RPC. Mirrors the
 * server-side constant in `node/rpc-generators.ts`. Internal — generators
 * are addressed by name, not by channel id, so consumers should never
 * subscribe here directly.
 *
 * @internal
 */
const GENERATOR_CHANNEL = 'devframe:rpc:generators'

/**
 * Shape of the envelope returned by the server's auto-generated wrapper
 * around a `type: 'generator'` definition. Internal — clients never see
 * this directly because `attachRpcGeneratorsClient` unwraps it.
 */
interface RpcGeneratorEnvelope {
  __generator: true
  streamId: string
}

function isGeneratorEnvelope(value: unknown): value is RpcGeneratorEnvelope {
  return (
    !!value
    && typeof value === 'object'
    && (value as any).__generator === true
    && typeof (value as any).streamId === 'string'
  )
}

/**
 * Hooks `rpc.call` so that calls to `type: 'generator'` server functions
 * resolve to a `StreamReader<Y>` (subscribed to the hidden generators
 * channel) instead of the raw `{ __generator: true, streamId }` envelope.
 *
 * Must be called after `rpc.streaming` is initialized so the host can
 * delegate to `rpc.streaming.subscribe()`.
 */
export function attachRpcGeneratorsClient(rpc: DevToolsRpcClient): void {
  const originalCall = rpc.call
  rpc.call = (async (name: any, ...args: any[]) => {
    const result = await originalCall(name, ...args)
    if (isGeneratorEnvelope(result)) {
      return rpc.streaming.subscribe(GENERATOR_CHANNEL, result.streamId) as unknown as StreamReader<unknown>
    }
    return result
  }) as typeof rpc.call
}
