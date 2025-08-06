/**
 * An extended `WeakMap` that can also hold regular keys.
 * (in those cases, it behaves like a regular `Map` and does not free memory)
 *
 * An additional `clear` method is added to clear the regular map.
 */
export class MaybeWeakMap<K, V> implements WeakMap<any, V> {
  private _map: Map<K, V>
  private _weakMap: WeakMap<any, V>

  constructor() {
    this._map = new Map()
    this._weakMap = new WeakMap()
  }

  [Symbol.toStringTag]: string = 'MaybeWeakMap'

  delete(key: K): boolean {
    if (this._weakMap.has(key))
      return this._weakMap.delete(key)
    return this._map.delete(key)
  }

  has(key: K): boolean {
    if (this._weakMap.has(key))
      return true
    return this._map.has(key)
  }

  set(key: K, value: V): this {
    if (this._weakMap.has(key))
      this._weakMap.set(key, value)
    else
      this._map.set(key, value)
    return this
  }

  get(key: K): V | undefined {
    if (this._weakMap.has(key))
      return this._weakMap.get(key)
    return this._map.get(key)
  }

  clear(): void {
    this._map.clear()
  }
}

/**
 * A `Map` that accepts an array of keys, treating it as a tuple.
 */
export class FixedTupleMap<K extends readonly any[], V> {
  private _mapTree: Map<any, any>

  constructor(
    public readonly length: K['length'],
  ) {
    this._mapTree = new Map()
  }

  private _getLastMap(key: K): Map<any, any> {
    let map = this._mapTree
    for (const k of key.slice(0, -1)) {
      if (!map.has(k)) {
        map.set(k, new Map())
      }
      map = map.get(k) as Map<any, any>
    }
    return map
  }

  set(key: K, value: V): this {
    if (key.length !== this.length) {
      throw new Error(`Expect tuple of length ${this.length}, got ${key.length}`)
    }
    const lastMap = this._getLastMap(key)
    lastMap.set(key[key.length - 1], value)
    return this
  }

  get(key: K): V | undefined {
    const lastMap = this._getLastMap(key)
    return lastMap.get(key[key.length - 1])
  }

  clear(): void {
    this._mapTree.clear()
  }

  delete(key: K): boolean {
    const lastMap = this._getLastMap(key)
    return lastMap.delete(key[key.length - 1])
  }

  get size(): number {
    return this._mapTree.size
  }

  * _traverseMap() {
    function* traverse(map: Map<any, any>, keys: any[], depthLeft: number): Generator<{ keys: any[], map: Map<any, V> }> {
      if (depthLeft === 0) {
        yield { keys, map }
      }
      else {
        for (const [key, value] of map.entries()) {
          yield* traverse(value, [...keys, key], depthLeft - 1)
        }
      }
    }

    yield* traverse(this._mapTree, [], this.length)
  }
}

export class TupleMap<K extends readonly any[], V> {
  private _lengthMap: Map<number, FixedTupleMap<K, V>>

  constructor() {
    this._lengthMap = new Map()
  }

  get(key: K): V | undefined {
    const length = key.length
    const map = this._lengthMap.get(length)
    return map?.get(key)
  }

  set(key: K, value: V): this {
    const length = key.length
    let map = this._lengthMap.get(length)
    if (!map) {
      map = new FixedTupleMap(length)
      this._lengthMap.set(length, map)
    }
    map.set(key, value)
    return this
  }

  delete(key: K): boolean {
    const length = key.length
    const map = this._lengthMap.get(length)
    return map?.delete(key) ?? false
  }

  clear(): void {
    this._lengthMap.clear()
  }
}

export function makeCachedFunction<T extends (...args: any[]) => any>(fn: T): T & { cache: TupleMap<Parameters<T>, ReturnType<T>> } {
  const cache = new TupleMap<Parameters<T>, ReturnType<T>>()
  const wrapper = function (this: ThisType<T>, ...args: Parameters<T>) {
    let result = cache.get(args)
    if (result)
      return result
    result = fn(...args)
    cache.set(args, result!)
    return result
  }
  wrapper.cache = cache
  return wrapper as T & { cache: TupleMap<Parameters<T>, ReturnType<T>> }
}
