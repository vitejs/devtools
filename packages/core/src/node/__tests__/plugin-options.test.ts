import type { DevToolsConfig } from '../config'
import type { DevTools } from '../plugins'
import { expectTypeOf, it } from 'vitest'

it('accepts config options and an integration directory', () => {
  type Options = Parameters<typeof DevTools>[0]
  type Expected = (Omit<DevToolsConfig, 'enabled' | 'apply'> & { cwd?: string }) | undefined

  expectTypeOf<keyof NonNullable<Options>>().toEqualTypeOf<keyof NonNullable<Expected>>()
  expectTypeOf<Options>().toExtend<Expected>()
  expectTypeOf<Expected>().toExtend<Options>()
})
