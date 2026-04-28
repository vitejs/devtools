import { expect, it } from 'vitest'
import { RpcCacheManager } from './cache'

it('cache', async () => {
  const cache = new RpcCacheManager({ functions: ['fn3'] })

  expect(cache.validate('fn1')).toBe(false)
  expect(cache.validate('fn3')).toBe(true)

  cache.updateOptions({ functions: ['fn1', 'fn2'] })
  expect(cache.validate('fn1')).toBe(true)
  expect(cache.validate('fn2')).toBe(true)
  expect(cache.validate('fn3')).toBe(false)
  cache.apply({ m: 'fn1', a: [1, 2] }, 100)
  cache.apply({ m: 'fn2', a: [3, 4] }, 200)
  expect(cache.cached<number>('fn1', [1, 2])).toBe(100)
  cache.clear('fn1')
  expect(cache.cached<number>('fn1', [1, 2])).toBeUndefined()
  cache.clear()
  expect(cache.cached<number>('fn2', [3, 4])).toBeUndefined()
})
