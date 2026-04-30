import type { GenericSchema, InferOutput } from 'valibot'
import { safeParse } from 'valibot'

/**
 * Schema map for typed CLI flags. Keys are flag names in camelCase —
 * this matches CAC's parsed-flag output ( `--no-open` → `noOpen` ). Each
 * value is a valibot schema used to both (a) derive the CAC option type
 * when the flag is registered and (b) validate / coerce the parsed
 * value before it's forwarded to `setup(ctx, { flags })`.
 */
export type CliFlagsSchema = Record<string, GenericSchema>

/**
 * Identity helper that preserves the literal schema-map type — use this
 * so `InferCliFlags<typeof myFlags>` resolves to the right object shape.
 *
 * ```ts
 * const appFlags = defineCliFlags({
 *   depth: v.pipe(v.number(), v.integer()),
 *   config: v.optional(v.string()),
 * })
 *
 * defineDevtool({
 *   cli: { flags: appFlags },
 *   setup(ctx, info) {
 *     const flags = info.flags as InferCliFlags<typeof appFlags>
 *     flags.depth // number
 *     flags.config // string | undefined
 *   },
 * })
 * ```
 */
export function defineCliFlags<T extends CliFlagsSchema>(flags: T): T {
  return flags
}

/** Extract the parsed-output type from a {@link CliFlagsSchema}. */
export type InferCliFlags<T extends CliFlagsSchema> = {
  [K in keyof T]: InferOutput<T[K]>
}

/**
 * Best-effort probe of a valibot schema to decide whether the
 * corresponding CAC option takes a value. Unwraps `optional` / `nullable`
 * / `nullish` / `default` / `pipe` wrappers then matches on the inner
 * type's kind.
 */
function getSchemaKind(schema: GenericSchema): string {
  let current: any = schema
  while (current) {
    const kind = current.type
    if (kind === 'optional' || kind === 'nullable' || kind === 'nullish' || kind === 'undefined') {
      current = current.wrapped ?? current.inner
      continue
    }
    if (kind === 'pipe' && Array.isArray(current.pipe) && current.pipe.length > 0) {
      current = current.pipe[0]
      continue
    }
    return kind
  }
  return 'unknown'
}

/** Whether the CAC option for this schema should be a boolean flag. */
export function isBooleanFlag(schema: GenericSchema): boolean {
  return getSchemaKind(schema) === 'boolean'
}

/** Validate and coerce the raw cac-parsed bag against a {@link CliFlagsSchema}. */
export function parseCliFlags(
  schema: CliFlagsSchema,
  raw: Record<string, unknown>,
): { flags: Record<string, unknown>, issues?: string[] } {
  const flags: Record<string, unknown> = {}
  const issues: string[] = []
  for (const [key, fieldSchema] of Object.entries(schema)) {
    const result = safeParse(fieldSchema, raw[key])
    if (result.success) {
      flags[key] = result.output
    }
    else {
      issues.push(`--${toKebab(key)}: ${result.issues.map(i => i.message).join(', ')}`)
    }
  }
  // Preserve any raw flags that aren't in the schema (e.g. --host, --port,
  // or options contributed via cli.configure) so authors keep access to
  // them.
  for (const [key, value] of Object.entries(raw)) {
    if (!(key in schema) && !(key in flags)) {
      flags[key] = value
    }
  }
  return issues.length ? { flags, issues } : { flags }
}

function toKebab(camel: string): string {
  return camel.replaceAll(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/** Kebab-case a schema key for CAC option registration. */
export function flagKeyToOption(camel: string): string {
  return toKebab(camel)
}
