import type { GenericSchema } from 'valibot'
import { toJsonSchema } from '@valibot/to-json-schema'

const FALLBACK_OBJECT_SCHEMA = Object.freeze({ type: 'object', additionalProperties: true })

/**
 * Convert a valibot return schema to JSON Schema.
 * @internal
 */
export function valibotReturnToJsonSchema(schema: GenericSchema | undefined): unknown {
  if (!schema)
    return undefined
  try {
    return toJsonSchema(schema as any)
  }
  catch {
    return FALLBACK_OBJECT_SCHEMA
  }
}

/**
 * Convert positional RPC args schemas to a single MCP-friendly object
 * schema. When the RPC declares `args: [v.object(...)]`, unwrap the
 * single-object schema directly (nicer agent UX than `{ arg0: {...} }`).
 *
 * Returns `undefined` when there are no args (the MCP SDK treats this
 * as `{ type: 'object', properties: {} }`).
 * @internal
 */
export function valibotArgsToJsonSchema(
  args: readonly GenericSchema[] | undefined,
): { schema: unknown, unwrapped: boolean } {
  if (!args || args.length === 0)
    return { schema: { type: 'object', properties: {} }, unwrapped: false }

  // Single-object arg: unwrap.
  if (args.length === 1) {
    const inner = safeToJsonSchema(args[0]!)
    if (isObjectJsonSchema(inner))
      return { schema: inner, unwrapped: true }
    // Non-object single arg (e.g. a string): fall through to arg0 shape.
  }

  const properties: Record<string, unknown> = {}
  const required: string[] = []
  for (let i = 0; i < args.length; i++) {
    const key = `arg${i}`
    const s = safeToJsonSchema(args[i]!)
    properties[key] = s
    // Conservatively mark every positional arg as required — the RPC
    // layer validates against valibot anyway.
    required.push(key)
  }

  return {
    schema: {
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    },
    unwrapped: false,
  }
}

function safeToJsonSchema(schema: GenericSchema): unknown {
  try {
    return toJsonSchema(schema as any)
  }
  catch {
    return FALLBACK_OBJECT_SCHEMA
  }
}

function isObjectJsonSchema(value: unknown): boolean {
  return (
    !!value
    && typeof value === 'object'
    && (value as { type?: unknown }).type === 'object'
  )
}
