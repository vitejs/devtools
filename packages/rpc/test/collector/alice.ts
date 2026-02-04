import type { RpcDefinitionsToFunctions } from '../../src'
import type { AliceFunctions } from './shared-types'
import * as v from 'valibot'
import { createDefineWrapperWithContext, RpcFunctionsCollectorBase } from '../../src'

interface AliceContext {
  name: 'alice'
  balance: number
  apples: number
}

const aliceContext: AliceContext = {
  name: 'alice',
  balance: 101,
  apples: 5,
}

export const defineAliceFunction = createDefineWrapperWithContext<AliceContext>()

const getBalance = defineAliceFunction({
  name: 'getBalance',
  type: 'static',
  setup: async (context) => {
    return {
      handler: () => {
        return context.balance
      },
    }
  },
})

const buyApples = defineAliceFunction({
  name: 'buyApples',
  type: 'action',
  args: [v.number()],
  returns: v.void(),
  setup: async (context) => {
    return {
      handler: (count: number) => {
        const earnings = count * 2
        if (context.apples >= count) {
          context.balance += earnings
          context.apples -= count
        }
        else {
          throw new Error('Insufficient apples')
        }
      },
    }
  },
})

const getAppleCount = defineAliceFunction({
  name: 'getAppleCount',
  type: 'query',
  setup: async (context) => {
    return {
      handler: () => {
        return context.apples
      },
    }
  },
})

const hi = defineAliceFunction({
  name: 'hi',
  type: 'static',
  handler: () => {
    return 'hi'
  },
})

export const functionDefs = [
  getBalance,
  buyApples,
  getAppleCount,
  hi,
] as const

declare module './shared-types' {
  interface AliceFunctions extends RpcDefinitionsToFunctions<typeof functionDefs> { }
}

export const aliceCollector = new RpcFunctionsCollectorBase<AliceFunctions, AliceContext>(aliceContext)
for (const dep of functionDefs) {
  aliceCollector.register(dep)
}
