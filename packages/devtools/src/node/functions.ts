import type { RpcFunctionDefinition, RpcFunctionsHost as RpcFunctionsHostType, ViteDevtoolsRpcFunctions } from '@vitejs/devtools-kit'

export class RpcFunctionsHost implements RpcFunctionsHostType {
  public readonly definitions: Map<string, RpcFunctionDefinition<string, any, any, any>> = new Map()

  constructor() {
  }

  register(fn: RpcFunctionDefinition<string, any, any, any>): void {
    this.definitions.set(fn.name, fn)
  }

  get functions(): ViteDevtoolsRpcFunctions {
    return Object.fromEntries(
      Array.from(this.definitions.entries())
        .map(([name, fn]) => [name, fn.handler]),
    ) as ViteDevtoolsRpcFunctions
  }
}
