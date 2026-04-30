import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { defineCliFlags, flagKeyToOption, isBooleanFlag, parseCliFlags } from '../flags'

describe('adapters/flags', () => {
  it('defineCliFlags returns the input untouched (identity)', () => {
    const schema = { depth: v.number() }
    expect(defineCliFlags(schema)).toBe(schema)
  })

  it('kebab-cases camelCase keys for CAC option names', () => {
    expect(flagKeyToOption('depth')).toBe('depth')
    expect(flagKeyToOption('noOpen')).toBe('no-open')
    expect(flagKeyToOption('configFile')).toBe('config-file')
  })

  it('detects boolean schemas (including optional/pipe wrappers)', () => {
    expect(isBooleanFlag(v.boolean())).toBe(true)
    expect(isBooleanFlag(v.optional(v.boolean()))).toBe(true)
    expect(isBooleanFlag(v.nullish(v.boolean()))).toBe(true)
    expect(isBooleanFlag(v.pipe(v.boolean()))).toBe(true)
    expect(isBooleanFlag(v.string())).toBe(false)
    expect(isBooleanFlag(v.number())).toBe(false)
  })

  describe('parseCliFlags', () => {
    const schema = defineCliFlags({
      depth: v.pipe(v.number(), v.integer()),
      config: v.optional(v.string()),
      verbose: v.optional(v.boolean()),
    })

    it('returns typed values when all inputs validate', () => {
      const { flags, issues } = parseCliFlags(schema, {
        depth: 8,
        config: './my.config.ts',
        verbose: true,
      })
      expect(issues).toBeUndefined()
      expect(flags).toEqual({
        depth: 8,
        config: './my.config.ts',
        verbose: true,
      })
    })

    it('allows optional flags to be omitted', () => {
      const { flags, issues } = parseCliFlags(schema, { depth: 4 })
      expect(issues).toBeUndefined()
      expect(flags.depth).toBe(4)
      expect(flags.config).toBeUndefined()
      expect(flags.verbose).toBeUndefined()
    })

    it('surfaces validation issues with kebab-cased flag names', () => {
      const { issues } = parseCliFlags(schema, { depth: 'not-a-number' })
      expect(issues).toBeDefined()
      expect(issues!.some(i => i.startsWith('--depth:'))).toBe(true)
    })

    it('preserves raw flags that are not in the schema (host/port escape hatch)', () => {
      const { flags } = parseCliFlags(schema, {
        depth: 2,
        host: '127.0.0.1',
        port: 9000,
      })
      expect(flags.host).toBe('127.0.0.1')
      expect(flags.port).toBe(9000)
    })
  })
})
