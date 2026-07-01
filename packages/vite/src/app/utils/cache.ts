export function makeCachedFunction<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>()
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args)
    if (!cache.has(key))
      cache.set(key, fn(...args))
    return cache.get(key)
  }) as T
}
