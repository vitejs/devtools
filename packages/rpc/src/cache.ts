import { hash } from 'ohash'

export interface RpcCacheOptions {
  functions: string[]
  keySerializer?: (args: unknown[]) => string
}

/**
 * @experimental API is expected to change.
 */
export class RpcCacheManager {
  private cacheMap = new Map<string, Map<string, unknown>>()
  private options: RpcCacheOptions
  private keySerializer: (args: unknown[]) => string

  constructor(options: RpcCacheOptions) {
    this.options = options
    this.keySerializer = options.keySerializer || ((args: unknown[]) => hash(args))
  }

  updateOptions(options: Partial<RpcCacheOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    }
  }

  cached<T>(m: string, a: unknown[]): T | undefined {
    const methodCache = this.cacheMap.get(m)
    if (methodCache) {
      return methodCache.get(this.keySerializer(a)) as T
    }
    return undefined
  }

  apply(req: { m: string, a: unknown[] }, res: unknown): void {
    const methodCache = this.cacheMap.get(req.m) || new Map<string, unknown>()
    methodCache.set(this.keySerializer(req.a), res)
    this.cacheMap.set(req.m, methodCache)
  }

  validate(m: string): boolean {
    return this.options.functions.includes(m)
  }

  clear(fn?: string): void {
    if (fn) {
      this.cacheMap.delete(fn)
    }
    else {
      this.cacheMap.clear()
    }
  }
}
