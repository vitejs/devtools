import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { valibotArgsToJsonSchema, valibotReturnToJsonSchema } from '../to-json-schema'

describe('valibotArgsToJsonSchema', () => {
  it('returns an empty object schema when no args', () => {
    const { schema, unwrapped } = valibotArgsToJsonSchema(undefined)
    expect(unwrapped).toBe(false)
    expect(schema).toEqual({ type: 'object', properties: {} })
  })

  it('wraps multiple positional args under arg0/arg1/...', () => {
    const { schema, unwrapped } = valibotArgsToJsonSchema([v.string(), v.number()])
    expect(unwrapped).toBe(false)
    expect(schema).toMatchObject({
      type: 'object',
      required: ['arg0', 'arg1'],
      additionalProperties: false,
    })
    const props = (schema as any).properties
    expect(props.arg0).toMatchObject({ type: 'string' })
    expect(props.arg1).toMatchObject({ type: 'number' })
  })

  it('unwraps a single object schema for nicer agent UX', () => {
    const { schema, unwrapped } = valibotArgsToJsonSchema([
      v.object({ name: v.string(), age: v.number() }),
    ])
    expect(unwrapped).toBe(true)
    expect((schema as any).type).toBe('object')
    const props = (schema as any).properties
    expect(props.name).toBeDefined()
    expect(props.age).toBeDefined()
  })

  it('keeps arg0 shape when the single arg is a primitive', () => {
    const { schema, unwrapped } = valibotArgsToJsonSchema([v.string()])
    expect(unwrapped).toBe(false)
    expect(schema).toMatchObject({ type: 'object', required: ['arg0'] })
  })
})

describe('valibotReturnToJsonSchema', () => {
  it('returns undefined when no schema is provided', () => {
    expect(valibotReturnToJsonSchema(undefined)).toBeUndefined()
  })

  it('converts a simple schema', () => {
    const schema = valibotReturnToJsonSchema(v.object({ ok: v.boolean() }))
    expect((schema as any).type).toBe('object')
    expect((schema as any).properties.ok).toMatchObject({ type: 'boolean' })
  })
})
