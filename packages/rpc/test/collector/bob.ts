import type { RpcDefinitionsToFunctions } from '../../src'
import type { BobFunctions } from './shared-types'
import { createDefineWrapperWithContext, RpcFunctionsCollectorBase } from '../../src'

interface BobContext {
  name: 'bob'
  money: number
}

const bobContext: BobContext = {
  name: 'bob',
  money: 50,
}

export const defineBobFunction = createDefineWrapperWithContext<BobContext>()

const getMoney = defineBobFunction({
  name: 'getMoney',
  type: 'static',
  cacheable: true,
  setup: async (context) => {
    return {
      handler: () => {
        return context.money
      },
    }
  },
})

const takeMoney = defineBobFunction({
  name: 'takeMoney',
  type: 'action',
  setup: async (context) => {
    return {
      handler: (amount: number) => {
        if (context.money >= amount) {
          context.money -= amount
        }
        else {
          throw new Error('Insufficient money')
        }
      },
    }
  },
})

export const functionDefs = [
  getMoney,
  takeMoney,
] as const

declare module './shared-types' {
  interface BobFunctions extends RpcDefinitionsToFunctions<typeof functionDefs> { }
}

export const bobCollector = new RpcFunctionsCollectorBase<BobFunctions, BobContext>(bobContext)
for (const dep of functionDefs) {
  bobCollector.register(dep)
}
