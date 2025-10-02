import type { DevToolsNodeContext, DevToolsRpcServerFunctions, RpcFunctionDefinition, RpcFunctionsHost as RpcFunctionsHostType } from '../../../kit/src'
import { getRpcHandler } from '../../../kit/src'

export class RpcFunctionsHost implements RpcFunctionsHostType {
  public readonly definitions: Map<string, RpcFunctionDefinition<string, any, any, any>> = new Map()
  public readonly functions: DevToolsRpcServerFunctions

  constructor(
    public readonly context: DevToolsNodeContext,
  ) {
    const definitions = this.definitions
    // eslint-disable-next-line ts/no-this-alias
    const self = this
    this.functions = new Proxy({}, {
      get(_, prop) {
        const definition = definitions.get(prop as string)
        if (!definition)
          return undefined
        return getRpcHandler(definition, self.context)
      },
      has(_, prop) {
        return definitions.has(prop as string)
      },
      getOwnPropertyDescriptor(_, prop) {
        return {
          value: definitions.get(prop as string)?.handler,
          configurable: true,
          enumerable: true,
        }
      },
      ownKeys() {
        return Array.from(definitions.keys())
      },
    }) as DevToolsRpcServerFunctions
  }

  register(fn: RpcFunctionDefinition<string, any, any, any>): void {
    this.definitions.set(fn.name, fn)
  }
}
