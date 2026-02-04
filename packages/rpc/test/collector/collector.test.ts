import type { AliceFunctions, BobFunctions } from './shared-types'
import { createBirpc } from 'birpc'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { defineRpcFunction } from '../../src'
import { aliceCollector } from './alice'
import { bobCollector } from './bob'

describe('collector', () => {
  const messageChannel = new MessageChannel()
  const bobToAlice = createBirpc<AliceFunctions, BobFunctions>(
    bobCollector.functions,
    {
      post: (msg) => {
        messageChannel.port2.postMessage(msg)
      },
      on: (cb) => {
        messageChannel.port2.addEventListener('message', event => cb(event.data))
      },
    },
  )
  const aliceToBob = createBirpc<BobFunctions, AliceFunctions>(
    aliceCollector.functions,
    {
      post: (msg) => {
        messageChannel.port1.postMessage(msg)
      },
      on: (cb) => {
        messageChannel.port1.addEventListener('message', (event) => {
          cb(event.data)
        })
      },
    },
  )

  it('register', async () => {
    expect(bobCollector.functions).toMatchInlineSnapshot(`
      {
        "getMoney": Promise {},
        "takeMoney": Promise {},
      }
    `)
    expect(aliceCollector.functions).toMatchInlineSnapshot(`
      {
        "buyApples": Promise {},
        "getAppleCount": Promise {},
        "getBalance": Promise {},
        "hi": Promise {},
      }
    `)
  })

  it('calling', async () => {
    expect(await bobToAlice.hi()).toBe('hi')

    expect(await aliceToBob.getMoney()).toBe(50)
    expect(await bobToAlice.getBalance()).toBe(101)

    expect(await bobToAlice.getAppleCount()).toBe(5)

    await bobToAlice.buyApples(3)

    expect(await bobToAlice.getAppleCount()).toBe(2)
    expect(await bobToAlice.getBalance()).toBe(107)
  })

  it('error', async () => {
    await expect(() => bobToAlice.buyApples(3))
      .rejects
      .toThrowErrorMatchingInlineSnapshot(`[Error: Insufficient apples]`)

    // @ts-expect-error missing types
    await expect(() => aliceToBob.foo())
      .rejects
      .toThrowErrorMatchingInlineSnapshot(`[Error: [birpc] function "foo" not found]`)
  })

  it('direct calling', async () => {
    expect(bobCollector.getHandler('getMoney')).toBeDefined()
    expect(
      await aliceCollector
        .getHandler('getBalance')
        .then(handler => handler()),
    )
      .toBe(107)
  })

  it('get schema', async () => {
    expect(aliceCollector.getSchema('getAppleCount')).toMatchInlineSnapshot(`
      {
        "args": undefined,
        "returns": undefined,
      }
    `)

    expect(aliceCollector.getSchema('buyApples')).toMatchSnapshot()
  })

  it('throws type error when schema mismatch handler type', async () => {
    defineRpcFunction({
      name: 'test',
      args: [v.string()],
      returns: v.void(),
      // @ts-expect-error setup handler type mismatch
      setup: () => {
        return {
          handler: (_count: number) => { },
        }
      },
    })

    defineRpcFunction({
      name: 'test',
      args: [v.string()],
      returns: v.void(),
      // @ts-expect-error handler type mismatch
      handler: (_count: number) => { },
    })
  })
})
