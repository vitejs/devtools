import type { RpcFunctionsHost as RpcFunctionsHostType } from '@vitejs/devtools-kit'

export class RpcFunctionsHost implements RpcFunctionsHostType {
  public readonly functions: Record<any, any>

  constructor(functions: Record<any, any> = {}) {
    this.functions = functions
  }

  register(name: string, handler: (...args: any[]) => any): void {
    this.functions[name] = handler
  }
}
