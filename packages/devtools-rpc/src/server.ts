import type { BirpcGroup, EventOptions } from 'birpc'
import { createBirpcGroup } from 'birpc'

export function createRpcServer<
  ClientFunctions extends object = Record<string, never>,
  ServerFunctions extends object = Record<string, never>,
>(
  functions: ServerFunctions,
  options: {
    preset: (rpc: BirpcGroup<ClientFunctions, ServerFunctions>) => void
    rpcOptions?: EventOptions<ClientFunctions>
  },
): BirpcGroup<ClientFunctions, ServerFunctions> {
  const rpc = createBirpcGroup<ClientFunctions, ServerFunctions>(functions, [], options?.rpcOptions ?? {})
  options?.preset(rpc)

  return rpc
}
