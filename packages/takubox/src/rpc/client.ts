import type { BirpcOptions, BirpcReturn } from 'birpc'
import { createBirpc } from 'birpc'

export function createRpcClient<
  ServerFunctions extends object = Record<string, never>,
  ClientFunctions extends object = Record<string, never>,
>(
  functions: ClientFunctions,
  options: {
    preset: BirpcOptions<ServerFunctions, ClientFunctions, false>
    rpcOptions?: Partial<BirpcOptions<ServerFunctions, ClientFunctions, boolean>>
  },
): BirpcReturn<ServerFunctions, ClientFunctions, false> {
  const { preset, rpcOptions = {} } = options
  return createBirpc<ServerFunctions, ClientFunctions, false>(functions, {
    ...preset,
    timeout: -1,
    ...rpcOptions,
    proxify: false,
  })
}
