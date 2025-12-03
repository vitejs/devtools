import type { BirpcOptions, BirpcReturn, ChannelOptions } from 'birpc'
import { createBirpc } from 'birpc'

export function createRpcClient<
  ServerFunctions,
  ClientFunctions extends object,
>(
  functions: ClientFunctions,
  options: {
    preset: ChannelOptions
    rpcOptions?: Partial<BirpcOptions<ServerFunctions, ClientFunctions>>
  },
): BirpcReturn<ServerFunctions, ClientFunctions> {
  const { preset, rpcOptions = {} } = options
  return createBirpc<ServerFunctions, ClientFunctions>(functions, {
    ...preset,
    timeout: -1,
    ...rpcOptions,
  })
}
