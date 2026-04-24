import type { BirpcGroup, EventOptions } from 'birpc'
import { createBirpcGroup } from 'birpc'

export function createRpcServer<
  ClientFunctions extends object = Record<string, never>,
  ServerFunctions extends object = Record<string, never>,
>(
  functions: ServerFunctions,
  options: {
    rpcOptions?: EventOptions<ClientFunctions, ServerFunctions, false>
  } = {},
): BirpcGroup<ClientFunctions, ServerFunctions, false> {
  return createBirpcGroup<ClientFunctions, ServerFunctions, false>(
    functions,
    [],
    {
      ...options.rpcOptions,
      proxify: false,
    },
  )
}
