import { hash } from 'ohash'
import { describe, expect, it } from 'vitest'
import {
  DEVTOOLS_RPC_DUMP_QUERY_DIR,
  DEVTOOLS_RPC_DUMP_QUERY_FALLBACK_FILENAME,
  DEVTOOLS_RPC_DUMP_QUERY_INDEX_FILENAME,
  DEVTOOLS_RPC_DUMP_QUERY_RECORDS_DIRNAME,
  DEVTOOLS_RPC_DUMP_STATIC_DIR,
} from '../constants'
import { createStaticRpcCaller } from './static-rpc'

const DEMO_STATIC_VERSION_PATH = `${DEVTOOLS_RPC_DUMP_STATIC_DIR}/demo%3Aversion.json`
const DEMO_QUERY_BASE_PATH = `${DEVTOOLS_RPC_DUMP_QUERY_DIR}/demo%3Aget-item`
const DEMO_QUERY_INDEX_PATH = `${DEMO_QUERY_BASE_PATH}/${DEVTOOLS_RPC_DUMP_QUERY_INDEX_FILENAME}`
const DEMO_QUERY_RECORDS_PATH = `${DEMO_QUERY_BASE_PATH}/${DEVTOOLS_RPC_DUMP_QUERY_RECORDS_DIRNAME}`
const DEMO_QUERY_FALLBACK_PATH = `${DEMO_QUERY_BASE_PATH}/${DEVTOOLS_RPC_DUMP_QUERY_FALLBACK_FILENAME}`

describe('createStaticRpcCaller', () => {
  it('loads static rpc shards lazily and caches by file path', async () => {
    const calls: string[] = []
    const caller = createStaticRpcCaller(
      {
        'demo:version': {
          type: 'static',
          path: DEMO_STATIC_VERSION_PATH,
        },
      },
      async (path) => {
        calls.push(path)
        return { output: '1.0.0' }
      },
    )

    await expect(caller.call('demo:version', [])).resolves.toBe('1.0.0')
    await expect(caller.call('demo:version', [])).resolves.toBe('1.0.0')
    expect(calls).toEqual([DEMO_STATIC_VERSION_PATH])
  })

  it('resolves query records, supports fallback, and replays dumped errors', async () => {
    const caller = createStaticRpcCaller(
      {
        'demo:get-item': {
          type: 'query',
          index: DEMO_QUERY_INDEX_PATH,
        },
      },
      async (path) => {
        if (path === DEMO_QUERY_INDEX_PATH) {
          return {
            records: {
              [hash(['a'])]: `${DEMO_QUERY_RECORDS_PATH}/ok.json`,
              [hash(['boom'])]: `${DEMO_QUERY_RECORDS_PATH}/error.json`,
            },
            fallback: DEMO_QUERY_FALLBACK_PATH,
          }
        }
        if (path.endsWith('/ok.json')) {
          return {
            inputs: ['a'],
            output: { id: 'a' },
          }
        }
        if (path.endsWith('/error.json')) {
          return {
            inputs: ['boom'],
            error: {
              name: 'TypeError',
              message: 'boom',
            },
          }
        }
        if (path.endsWith('/fallback.json')) {
          return {
            inputs: [],
            output: null,
          }
        }
        throw new Error(`Unexpected path: ${path}`)
      },
    )

    await expect(caller.call('demo:get-item', ['a'])).resolves.toEqual({ id: 'a' })
    await expect(caller.call('demo:get-item', ['missing'])).resolves.toBeNull()
    await expect(caller.call('demo:get-item', ['boom'])).rejects.toThrow('boom')
  })

  it('keeps call strict while optional/event calls are soft for missing methods', async () => {
    const caller = createStaticRpcCaller({}, async () => {
      throw new Error('Should not fetch')
    })

    await expect(caller.callOptional('demo:missing', [])).resolves.toBeUndefined()
    await expect(caller.callEvent('demo:missing', [])).resolves.toBeUndefined()
    await expect(caller.call('demo:missing', [])).rejects.toThrow('[devtools-rpc] Function "demo:missing" not found in dump store')
  })

  it('treats callEvent as no-op in static mode even for known methods', async () => {
    const caller = createStaticRpcCaller(
      {
        'demo:version': {
          type: 'static',
          path: DEMO_STATIC_VERSION_PATH,
        },
      },
      async () => {
        throw new Error('Should not fetch')
      },
    )

    await expect(caller.callEvent('demo:version', [])).resolves.toBeUndefined()
  })

  it('supports legacy inline manifest values for backward compatibility', async () => {
    const caller = createStaticRpcCaller(
      {
        'demo:legacy': { ok: true },
      },
      async () => {
        throw new Error('Should not fetch')
      },
    )

    await expect(caller.call('demo:legacy', [])).resolves.toEqual({ ok: true })
  })
})
