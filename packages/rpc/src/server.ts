import type { BirpcGroup, EventOptions } from 'birpc'
import { createBirpcGroup } from 'birpc'

export function createRpcServer<
  ClientFunctions extends object = Record<string, never>,
  ServerFunctions extends object = Record<string, never>,
>(
  functions: ServerFunctions,
  options: {
    preset: (rpc: BirpcGroup<ClientFunctions, ServerFunctions, false>) => void
    rpcOptions?: EventOptions<ClientFunctions, ServerFunctions, false>
  },
): BirpcGroup<ClientFunctions, ServerFunctions, false> {
  const rpc = createBirpcGroup<ClientFunctions, ServerFunctions, false>(
    functions,
    [],
    {
      ...options?.rpcOptions,
      proxify: false,
    },
  )
  options?.preset(rpc)

  return rpc
}
