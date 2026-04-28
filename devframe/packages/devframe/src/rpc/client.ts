import type { BirpcOptions, BirpcReturn, ChannelOptions } from 'birpc'
import { createBirpc } from 'birpc'

export function createRpcClient<
  ServerFunctions extends object = Record<string, never>,
  ClientFunctions extends object = Record<string, never>,
>(
  functions: ClientFunctions,
  options: {
    channel: ChannelOptions
    rpcOptions?: Partial<BirpcOptions<ServerFunctions, ClientFunctions, boolean>>
  },
): BirpcReturn<ServerFunctions, ClientFunctions, false> {
  const { channel, rpcOptions = {} } = options
  return createBirpc<ServerFunctions, ClientFunctions, false>(functions, {
    ...channel,
    timeout: -1,
    ...rpcOptions,
    proxify: false,
  })
}
