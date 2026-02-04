import type { RpcDumpRecord } from './types'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { createClientFromDump, createDefineWrapperWithContext, defineRpcFunction, dumpFunctions } from '.'

describe('dumps', () => {
  it('should collect dumps from definition', async () => {
    const add = defineRpcFunction({
      name: 'add',
      dump: {
        inputs: [[1, 2], [3, 4], [5, 6]],
      },
      handler: (a: number, b: number) => a + b,
    })

    const store = await dumpFunctions([add])

    expect(Object.keys(store.definitions).length).toBe(1)
    expect('add' in store.definitions).toBe(true)

    // Get all records for 'add' function
    const addRecords = Object.entries(store.records)
      .filter(([key]) => key.startsWith('add---') && !key.endsWith('---fallback'))
      .map(([, record]) => record as RpcDumpRecord)

    expect(addRecords.length).toBe(3)
    expect(addRecords[0]).toMatchObject({ inputs: [1, 2], output: 3 })
    expect(addRecords[1]).toMatchObject({ inputs: [3, 4], output: 7 })
    expect(addRecords[2]).toMatchObject({ inputs: [5, 6], output: 11 })
  })

  it('should create dump client and return correct results', async () => {
    const greet = defineRpcFunction({
      name: 'greet',
      dump: {
        inputs: [['Alice'], ['Bob'], ['Charlie']],
      },
      handler: (name: string) => `Hello, ${name}!`,
    })

    const store = await dumpFunctions([greet])
    const client = createClientFromDump(store)

    await expect(client.greet('Alice')).resolves.toBe('Hello, Alice!')
    await expect(client.greet('Bob')).resolves.toBe('Hello, Bob!')
    await expect(client.greet('Charlie')).resolves.toBe('Hello, Charlie!')
  })

  it('should return fallback for non-matching args when fallback is provided', async () => {
    const greet = defineRpcFunction({
      name: 'greet',
      dump: {
        inputs: [['Alice'], ['Bob']],
        fallback: 'Hello, stranger!',
      },
      handler: (name: string) => `Hello, ${name}!`,
    })

    const store = await dumpFunctions([greet])
    const client = createClientFromDump(store)

    await expect(client.greet('Alice')).resolves.toBe('Hello, Alice!')
    await expect(client.greet('Unknown')).resolves.toBe('Hello, stranger!')
  })

  it('should throw error for non-matching args when fallback is not provided', async () => {
    const greet = defineRpcFunction({
      name: 'greet',
      dump: {
        inputs: [['Alice'], ['Bob']],
      },
      handler: (name: string) => `Hello, ${name}!`,
    })

    const store = await dumpFunctions([greet])
    const client = createClientFromDump(store)

    await expect(client.greet('Alice')).resolves.toBe('Hello, Alice!')
    await expect(client.greet('Unknown')).rejects.toThrow('[devtools-rpc] No dump match for "greet"')
  })

  it('should handle errors in dumps', async () => {
    const divide = defineRpcFunction({
      name: 'divide',
      dump: {
        inputs: [[10, 2], [10, 0]],
      },
      handler: (a: number, b: number) => {
        if (b === 0)
          throw new Error('Division by zero')
        return a / b
      },
    })

    const store = await dumpFunctions([divide])

    // Get all records for 'divide' function
    const divideRecords = Object.entries(store.records)
      .filter(([key]) => key.startsWith('divide---') && !key.endsWith('---fallback'))
      .map(([, record]) => record as RpcDumpRecord)

    expect(divideRecords[0]).toMatchObject({ inputs: [10, 2], output: 5 })
    expect(divideRecords[1]!.inputs).toEqual([10, 0])
    expect(divideRecords[1]!.error).toBeDefined()
    expect(divideRecords[1]!.error?.message).toBe('Division by zero')
    expect(divideRecords[1]!.error?.name).toBe('Error')

    const client = createClientFromDump(store)

    await expect(client.divide(10, 2)).resolves.toBe(5)
    await expect(client.divide(10, 0)).rejects.toThrow('Division by zero')
  })

  it('should collect dumps from setup result', async () => {
    const defineWithContext = createDefineWrapperWithContext<{ balance: number }>()

    const getBalance = defineWithContext({
      name: 'getBalance',
      setup: (context) => {
        return {
          handler: () => context.balance,
          dump: {
            inputs: [[]] as [][], // Type as tuple array
          },
        }
      },
    })

    const store = await dumpFunctions([getBalance], { balance: 100 })

    // Get all records for 'getBalance' function
    const balanceRecords = Object.entries(store.records)
      .filter(([key]) => key.startsWith('getBalance---') && !key.endsWith('---fallback'))
      .map(([, record]) => record as RpcDumpRecord)

    expect(balanceRecords.length).toBe(1)
    expect(balanceRecords[0]).toMatchObject({ inputs: [], output: 100 })

    const client = createClientFromDump(store)
    await expect(client.getBalance()).resolves.toBe(100)
  })

  it('should prioritize setup dumps over definition dumps', async () => {
    const defineWithContext = createDefineWrapperWithContext<{ multiplier: number }>()

    const getValue = defineWithContext({
      name: 'getValue',
      dump: {
        inputs: [[1], [2]],
      },
      setup: (context) => {
        return {
          handler: (x: number) => x * context.multiplier,
          dump: {
            inputs: [[5], [10]], // Different inputs from definition
          },
        }
      },
    })

    const store = await dumpFunctions([getValue], { multiplier: 3 })

    // Get all records for 'getValue' function
    const valueRecords = Object.entries(store.records)
      .filter(([key]) => key.startsWith('getValue---') && !key.endsWith('---fallback'))
      .map(([, record]) => record as RpcDumpRecord)

    // Should use setup dumps, not definition dumps
    expect(valueRecords.length).toBe(2)
    expect(valueRecords[0]).toMatchObject({ inputs: [5], output: 15 })
    expect(valueRecords[1]).toMatchObject({ inputs: [10], output: 30 })
  })

  it('should handle context-dependent dumps', async () => {
    const defineWithContext = createDefineWrapperWithContext<{ env: 'dev' | 'prod' }>()

    const getConfig = defineWithContext({
      name: 'getConfig',
      setup: (context) => {
        return {
          handler: (_key: string) => {
            const configs = {
              dev: { apiUrl: 'http://localhost:3000' },
              prod: { apiUrl: 'https://api.example.com' },
            }
            return configs[context.env]
          },
          dump: {
            inputs: [['apiUrl']] as [string][], // Type as tuple array
          },
        }
      },
    })

    const devStore = await dumpFunctions([getConfig], { env: 'dev' })
    const devClient = createClientFromDump(devStore)
    await expect(devClient.getConfig('apiUrl')).resolves.toEqual({ apiUrl: 'http://localhost:3000' })

    const prodStore = await dumpFunctions([getConfig], { env: 'prod' })
    const prodClient = createClientFromDump(prodStore)
    await expect(prodClient.getConfig('apiUrl')).resolves.toEqual({ apiUrl: 'https://api.example.com' })
  })

  it('should match arguments correctly with ohash', async () => {
    const complexArgs = defineRpcFunction({
      name: 'complexArgs',
      dump: {
        inputs: [
          [{ id: 1, name: 'Alice' }, [1, 2, 3]],
          [{ id: 2, name: 'Bob' }, [4, 5, 6]],
        ],
      },
      handler: (user: { id: number, name: string }, nums: number[]) => {
        return `${user.name}: ${nums.join(',')}`
      },
    })

    const store = await dumpFunctions([complexArgs])
    const client = createClientFromDump(store)

    await expect(client.complexArgs({ id: 1, name: 'Alice' }, [1, 2, 3])).resolves.toBe('Alice: 1,2,3')
    await expect(client.complexArgs({ id: 2, name: 'Bob' }, [4, 5, 6])).resolves.toBe('Bob: 4,5,6')

    // Different order should still match due to object hashing
    await expect(client.complexArgs({ name: 'Alice', id: 1 }, [1, 2, 3])).resolves.toBe('Alice: 1,2,3')
  })

  it('should call onMiss callback when no match found', async () => {
    const add = defineRpcFunction({
      name: 'add',
      dump: {
        inputs: [[1, 2]],
        fallback: 0,
      },
      handler: (a: number, b: number) => a + b,
    })

    const store = await dumpFunctions([add])

    const misses: Array<{ functionName: string, args: any[] }> = []
    const client = createClientFromDump(store, {
      onMiss: (functionName, args) => {
        misses.push({ functionName, args })
      },
    })

    await expect(client.add(1, 2)).resolves.toBe(3)
    expect(misses).toHaveLength(0)

    await expect(client.add(3, 4)).resolves.toBe(0) // Returns fallback
    expect(misses).toHaveLength(1)
    expect(misses[0]).toEqual({ functionName: 'add', args: [3, 4] })
  })

  it('should throw error for non-existent function', async () => {
    const add = defineRpcFunction({
      name: 'add',
      dump: {
        inputs: [[1, 2]],
      },
      handler: (a: number, b: number) => a + b,
    })

    const store = await dumpFunctions([add])
    const client = createClientFromDump(store)

    expect(() => (client as any).subtract(1, 2)).toThrow('[devtools-rpc] Function "subtract" not found in dump store')
  })

  it('should skip functions without dumps during collection', async () => {
    const withDump = defineRpcFunction({
      name: 'withDump',
      dump: {
        inputs: [[1]],
      },
      handler: (x: number) => x * 2,
    })

    const withoutDump = defineRpcFunction({
      name: 'withoutDump',
      handler: (x: number) => x * 3,
    })

    const store = await dumpFunctions([withDump, withoutDump])

    expect(Object.keys(store.definitions).length).toBe(1)
    expect('withDump' in store.definitions).toBe(true)
    expect('withoutDump' in store.definitions).toBe(false)
  })

  it('should handle async handlers', async () => {
    const fetchData = defineRpcFunction({
      name: 'fetchData',
      dump: {
        inputs: [['user1'], ['user2']],
      },
      handler: async (id: string) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return { id, data: `Data for ${id}` }
      },
    })

    const store = await dumpFunctions([fetchData])

    // Get all records for 'fetchData' function
    const fetchDataRecords = Object.entries(store.records)
      .filter(([key]) => key.startsWith('fetchData---') && !key.endsWith('---fallback'))
      .map(([, record]) => record as RpcDumpRecord)

    expect(fetchDataRecords.length).toBe(2)
    expect(fetchDataRecords[0]?.output).toEqual({ id: 'user1', data: 'Data for user1' })
    expect(fetchDataRecords[1]?.output).toEqual({ id: 'user2', data: 'Data for user2' })
  })

  it('should preserve metadata in dumps', async () => {
    const getUser = defineRpcFunction({
      name: 'getUser',
      type: 'query',
      args: [v.string()],
      returns: v.object({ id: v.string(), name: v.string() }),
      dump: {
        inputs: [['user1']],
      },
      handler: (id: string) => ({ id, name: `User ${id}` }),
    })

    const store = await dumpFunctions([getUser])
    const userDefinition = store.definitions.getUser

    expect(userDefinition!.name).toBe('getUser')
    expect(userDefinition!.type).toBe('query')
  })

  it('should support dump as a getter function', async () => {
    const defineWithContext = createDefineWrapperWithContext<{ multiplier: number, values: number[] }>()

    const multiply = defineWithContext({
      name: 'multiply',
      handler: (x: number) => x * 10,
      dump: (context, _handler) => ({
        inputs: context.values.map(v => [v * context.multiplier]),
        fallback: 0,
      }),
    })

    const store = await dumpFunctions([multiply], { multiplier: 2, values: [1, 2, 3] })

    // Get all records for 'multiply' function (excluding fallback)
    const multiplyRecords = Object.entries(store.records)
      .filter(([key]) => key.startsWith('multiply---') && !key.endsWith('---fallback'))
      .map(([, record]) => record as RpcDumpRecord)

    expect(multiplyRecords.length).toBe(3)
    expect(multiplyRecords[0]).toMatchObject({ inputs: [2], output: 20 })
    expect(multiplyRecords[1]).toMatchObject({ inputs: [4], output: 40 })
    expect(multiplyRecords[2]).toMatchObject({ inputs: [6], output: 60 })

    const client = createClientFromDump(store)
    await expect(client.multiply(2)).resolves.toBe(20)
    await expect(client.multiply(4)).resolves.toBe(40)
    await expect(client.multiply(100)).resolves.toBe(0) // Fallback
  })

  it('should support async dump getter function', async () => {
    const defineWithContext = createDefineWrapperWithContext<{ getUserIds: () => Promise<string[]> }>()

    const getUser = defineWithContext({
      name: 'getUser',
      handler: (id: string) => ({ id, name: `User ${id}` }),
      dump: async (context, _handler) => {
        const userIds = await context.getUserIds()
        return {
          inputs: userIds.map(id => [id]),
        }
      },
    })

    const store = await dumpFunctions([getUser], {
      getUserIds: async () => ['user1', 'user2'],
    })

    // Get all records for 'getUser' function
    const userRecords = Object.entries(store.records)
      .filter(([key]) => key.startsWith('getUser---') && !key.endsWith('---fallback'))
      .map(([, record]) => record as RpcDumpRecord)

    expect(userRecords.length).toBe(2)
    expect(userRecords[0]).toMatchObject({ inputs: ['user1'], output: { id: 'user1', name: 'User user1' } })
    expect(userRecords[1]).toMatchObject({ inputs: ['user2'], output: { id: 'user2', name: 'User user2' } })
  })

  it('should snapshot the store structure', async () => {
    const add = defineRpcFunction({
      name: 'add',
      args: [v.number(), v.number()],
      returns: v.number(),
      dump: {
        inputs: [[1, 2], [3, 4]],
        fallback: 0,
      },
      handler: (a: number, b: number) => a + b,
    })

    const greet = defineRpcFunction({
      name: 'greet',
      dump: {
        inputs: [['Alice'], ['Bob']],
      },
      handler: (name: string) => `Hello, ${name}!`,
    })

    const store = await dumpFunctions([add, greet])
    expect(store).toMatchSnapshot()
  })

  describe('dump snapshots', () => {
    it('should snapshot dump with errors', async () => {
      const divide = defineRpcFunction({
        name: 'divide',
        dump: {
          inputs: [[10, 2], [10, 0], [20, 4]],
        },
        handler: (a: number, b: number) => {
          if (b === 0)
            throw new Error('Division by zero')
          return a / b
        },
      })

      const store = await dumpFunctions([divide])
      expect(store).toMatchSnapshot()
    })

    it('should snapshot dump with pre-computed records', async () => {
      const multiply = defineRpcFunction({
        name: 'multiply',
        handler: (a: number, b: number) => a * b,
        dump: {
          records: [
            { inputs: [2, 3], output: 6 },
            { inputs: [4, 5], output: 20 },
            { inputs: [10, 0], output: 0 },
          ],
        },
      })

      const store = await dumpFunctions([multiply])
      expect(store).toMatchSnapshot()
    })

    it('should snapshot dump with mixed inputs and records', async () => {
      const add = defineRpcFunction({
        name: 'add',
        handler: (a: number, b: number) => a + b,
        dump: {
          inputs: [[1, 2], [3, 4]],
          records: [
            { inputs: [10, 20], output: 30 },
            { inputs: [100, 200], output: 300 },
          ],
        },
      })

      const store = await dumpFunctions([add])
      expect(store).toMatchSnapshot()
    })

    it('should snapshot dump with context-dependent functions', async () => {
      const defineWithContext = createDefineWrapperWithContext<{ env: 'dev' | 'prod' }>()

      const getConfig = defineWithContext({
        name: 'getConfig',
        setup: (context) => {
          return {
            handler: (_key: string) => {
              const configs = {
                dev: { apiUrl: 'http://localhost:3000', debug: true },
                prod: { apiUrl: 'https://api.example.com', debug: false },
              }
              return configs[context.env]
            },
            dump: {
              inputs: [['apiUrl']] as [string][],
            },
          }
        },
      })

      const store = await dumpFunctions([getConfig], { env: 'dev' })
      expect(store).toMatchSnapshot()
    })

    it('should snapshot dump with fallback values', async () => {
      const greet = defineRpcFunction({
        name: 'greet',
        dump: {
          inputs: [['Alice'], ['Bob']],
          fallback: 'Hello, stranger!',
        },
        handler: (name: string) => `Hello, ${name}!`,
      })

      const store = await dumpFunctions([greet])
      expect(store).toMatchSnapshot()
    })

    it('should snapshot dump with static functions', async () => {
      const getVersion = defineRpcFunction({
        name: 'getVersion',
        type: 'static',
        handler: () => '1.0.0',
      })

      const getConfig = defineRpcFunction({
        name: 'getConfig',
        type: 'static',
        handler: () => ({
          apiUrl: 'https://api.example.com',
          version: 'v1',
          features: ['auth', 'cache'],
        }),
      })

      const store = await dumpFunctions([getVersion, getConfig])
      expect(store).toMatchSnapshot()
    })

    it('should snapshot comprehensive dump with multiple scenarios', async () => {
      const divide = defineRpcFunction({
        name: 'divide',
        dump: {
          inputs: [[10, 2], [10, 0]],
        },
        handler: (a: number, b: number) => {
          if (b === 0)
            throw new Error('Division by zero')
          return a / b
        },
      })

      const multiply = defineRpcFunction({
        name: 'multiply',
        handler: (a: number, b: number) => a * b,
        dump: {
          records: [
            { inputs: [2, 3], output: 6 },
          ],
        },
      })

      const add = defineRpcFunction({
        name: 'add',
        handler: (a: number, b: number) => a + b,
        dump: {
          inputs: [[1, 2]],
          records: [
            { inputs: [10, 20], output: 30 },
          ],
          fallback: 0,
        },
      })

      const getConfig = defineRpcFunction({
        name: 'getConfig',
        type: 'static',
        handler: () => ({ version: '1.0.0' }),
      })

      const store = await dumpFunctions([divide, multiply, add, getConfig])
      expect(store).toMatchSnapshot()
    })
  })

  it('should throw error if action type function has dump', async () => {
    const sendEmail = defineRpcFunction({
      name: 'sendEmail',
      type: 'action',
      dump: {
        inputs: [['test@example.com']],
      },
      handler: (email: string) => `Sent to ${email}`,
    })

    await expect(dumpFunctions([sendEmail])).rejects.toThrow(
      '[devtools-rpc] Function "sendEmail" with type "action" cannot have dump configuration',
    )
  })

  it('should throw error if event type function has dump', async () => {
    const notifyUser = defineRpcFunction({
      name: 'notifyUser',
      type: 'event',
      dump: {
        inputs: [['user1']],
      },
      handler: (userId: string) => `Notified ${userId}`,
    })

    await expect(dumpFunctions([notifyUser])).rejects.toThrow(
      '[devtools-rpc] Function "notifyUser" with type "event" cannot have dump configuration',
    )
  })

  it('should allow query type function with dump', async () => {
    const getUser = defineRpcFunction({
      name: 'getUser',
      type: 'query',
      dump: {
        inputs: [['user1']],
      },
      handler: (id: string) => ({ id, name: `User ${id}` }),
    })

    const store = await dumpFunctions([getUser])
    expect(store.definitions.getUser).toBeDefined()
  })

  it('should allow static type function with dump', async () => {
    const getConfig = defineRpcFunction({
      name: 'getConfig',
      type: 'static',
      dump: {
        inputs: [[]],
      },
      handler: () => ({ apiUrl: 'https://api.example.com' }),
    })

    const store = await dumpFunctions([getConfig])
    expect(store.definitions.getConfig).toBeDefined()
  })

  it('should allow function without type (defaults to query) with dump', async () => {
    const getData = defineRpcFunction({
      name: 'getData',
      dump: {
        inputs: [[]],
      },
      handler: () => 'data',
    })

    const store = await dumpFunctions([getData])
    expect(store.definitions.getData).toBeDefined()
  })

  it('should automatically dump static functions without explicit dump config', async () => {
    const getConfig = defineRpcFunction({
      name: 'getConfig',
      type: 'static',
      handler: () => ({ apiUrl: 'https://api.example.com', version: 'v1' }),
    })

    const store = await dumpFunctions([getConfig])

    // Should have definition
    expect(store.definitions.getConfig).toBeDefined()
    expect(store.definitions.getConfig!.type).toBe('static')

    // Should have one record with empty inputs
    const configRecords = Object.entries(store.records)
      .filter(([key]) => key.startsWith('getConfig---') && !key.endsWith('---fallback'))
      .map(([, record]) => record as RpcDumpRecord)

    expect(configRecords.length).toBe(1)
    expect(configRecords[0]!.inputs).toEqual([])
    expect(configRecords[0]!.output).toEqual({ apiUrl: 'https://api.example.com', version: 'v1' })
  })

  it('should use client with static function that has default dump', async () => {
    const getVersion = defineRpcFunction({
      name: 'getVersion',
      type: 'static',
      handler: () => '1.0.0',
    })

    const store = await dumpFunctions([getVersion])
    const client = createClientFromDump(store)

    await expect(client.getVersion()).resolves.toBe('1.0.0')
  })

  it('should respect explicit dump config over default for static functions', async () => {
    const getConfigForEnv = defineRpcFunction({
      name: 'getConfigForEnv',
      type: 'static',
      dump: {
        inputs: [['dev'], ['prod']],
      },
      handler: (env: string) => ({ env, apiUrl: `https://${env}.api.example.com` }),
    })

    const store = await dumpFunctions([getConfigForEnv])

    // Should have two records (for dev and prod), not the default empty args
    const configRecords = Object.entries(store.records)
      .filter(([key]) => key.startsWith('getConfigForEnv---') && !key.endsWith('---fallback'))
      .map(([, record]) => record as RpcDumpRecord)

    expect(configRecords.length).toBe(2)
    expect(configRecords.some(r => r.inputs[0] === 'dev')).toBe(true)
    expect(configRecords.some(r => r.inputs[0] === 'prod')).toBe(true)
  })

  it('should support pre-computed records in dump', async () => {
    const multiply = defineRpcFunction({
      name: 'multiply',
      handler: (a: number, b: number) => a * b,
      dump: {
        records: [
          { inputs: [2, 3], output: 6 },
          { inputs: [4, 5], output: 20 },
          { inputs: [10, 0], output: 0 },
        ],
      },
    })

    const store = await dumpFunctions([multiply])

    const multiplyRecords = Object.entries(store.records)
      .filter(([key]) => key.startsWith('multiply---') && !key.endsWith('---fallback'))
      .map(([, record]) => record as RpcDumpRecord)

    expect(multiplyRecords.length).toBe(3)
    expect(multiplyRecords[0]).toMatchObject({ inputs: [2, 3], output: 6 })
    expect(multiplyRecords[1]).toMatchObject({ inputs: [4, 5], output: 20 })
    expect(multiplyRecords[2]).toMatchObject({ inputs: [10, 0], output: 0 })

    // Verify client works with pre-computed records
    const client = createClientFromDump(store)
    await expect(client.multiply(2, 3)).resolves.toBe(6)
    await expect(client.multiply(4, 5)).resolves.toBe(20)
    await expect(client.multiply(10, 0)).resolves.toBe(0)
  })

  it('should support mixing inputs and records', async () => {
    const add = defineRpcFunction({
      name: 'add',
      handler: (a: number, b: number) => a + b,
      dump: {
        inputs: [[1, 2], [3, 4]],
        records: [
          { inputs: [10, 20], output: 30 },
        ],
      },
    })

    const store = await dumpFunctions([add])

    const addRecords = Object.entries(store.records)
      .filter(([key]) => key.startsWith('add---') && !key.endsWith('---fallback'))
      .map(([, record]) => record as RpcDumpRecord)

    expect(addRecords.length).toBe(3)

    const client = createClientFromDump(store)
    await expect(client.add(1, 2)).resolves.toBe(3)
    await expect(client.add(3, 4)).resolves.toBe(7)
    await expect(client.add(10, 20)).resolves.toBe(30)
  })

  it('should support error records', async () => {
    const divide = defineRpcFunction({
      name: 'divide',
      handler: (a: number, b: number) => a / b,
      dump: {
        records: [
          { inputs: [10, 2], output: 5 },
          {
            inputs: [10, 0],
            error: {
              message: 'Cannot divide by zero',
              name: 'Error',
            },
          },
        ],
      },
    })

    const store = await dumpFunctions([divide])
    const client = createClientFromDump(store)

    await expect(client.divide(10, 2)).resolves.toBe(5)
    await expect(client.divide(10, 0)).rejects.toThrow('Cannot divide by zero')
  })

  it('should support parallel execution', async () => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    const slowAdd = defineRpcFunction({
      name: 'slowAdd',
      handler: async (a: number, b: number) => {
        await delay(10)
        return a + b
      },
      dump: {
        inputs: [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]],
      },
    })

    const startTime = Date.now()
    const store = await dumpFunctions([slowAdd], undefined, { concurrency: true })
    const parallelTime = Date.now() - startTime

    // Verify all results are correct
    const records = Object.entries(store.records)
      .filter(([key]) => key.startsWith('slowAdd---'))
      .map(([, record]) => record as RpcDumpRecord)

    expect(records.length).toBe(5)
    expect(records[0]).toMatchObject({ inputs: [1, 2], output: 3 })
    expect(records[1]).toMatchObject({ inputs: [3, 4], output: 7 })
    expect(records[2]).toMatchObject({ inputs: [5, 6], output: 11 })

    // Parallel execution should be faster than sequential (roughly)
    // 5 operations * 10ms = 50ms sequential, but parallel should be ~10-20ms
    expect(parallelTime).toBeLessThan(40)
  })

  it('should respect concurrency limit', async () => {
    let maxConcurrent = 0
    let currentConcurrent = 0

    const trackedAdd = defineRpcFunction({
      name: 'trackedAdd',
      handler: async (a: number, b: number) => {
        currentConcurrent++
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent)
        await new Promise(resolve => setTimeout(resolve, 10))
        currentConcurrent--
        return a + b
      },
      dump: {
        inputs: [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]],
      },
    })

    await dumpFunctions([trackedAdd], undefined, {
      concurrency: 2,
    })

    // With concurrency limit of 2, max concurrent should never exceed 2
    expect(maxConcurrent).toBeLessThanOrEqual(2)
    expect(maxConcurrent).toBeGreaterThan(0)
  })
})
