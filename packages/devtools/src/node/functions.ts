import type { DevToolsRpcServerFunctions, RpcContext, RpcFunctionDefinition, RpcFunctionsHost as RpcFunctionsHostType } from '@vitejs/devtools-kit'
import { getRpcHandler } from '@vitejs/devtools-kit'

export class RpcFunctionsHost implements RpcFunctionsHostType {
  public readonly definitions: Map<string, RpcFunctionDefinition<string, any, any, any>> = new Map()
  public readonly functions: DevToolsRpcServerFunctions
  public readonly context: RpcContext

  constructor(_context: Omit<RpcContext, 'functions'>) {
    this.context = {
      ..._context,
      functions: this,
    }
    const definitions = this.definitions
    this.functions = new Proxy({}, {
      get(_, prop) {
        const definition = definitions.get(prop as string)
        if (!definition)
          return undefined
        return getRpcHandler(definition, this.context)
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
