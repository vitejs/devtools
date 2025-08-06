import type { RpcContext } from '@vitejs/devtools-kit'
import type { ServerFunctions } from './rpc/index'
import { rpcFunctions } from './rpc/index'

export interface CreateServerFunctionsOptions extends RpcContext {
}

export async function createServerFunctions(options: CreateServerFunctionsOptions): Promise<ServerFunctions> {
  const functions = await Promise.all(
    rpcFunctions
      .map(async fn => [fn.name, (await fn.setup(options)).handler]),
  )
  return Object.fromEntries(functions)
}
