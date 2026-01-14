import type { GenericSchema } from 'valibot'
import { builtinRpcSchemas } from '@vitejs/devtools'
import { serverRpcSchemas } from '@vitejs/devtools-vite'
import { parse } from 'valibot'

const rpcSchemas = new Map([
  ...builtinRpcSchemas,
  ...serverRpcSchemas,
])

export function validateSchema(schema: GenericSchema, data: any, prefix: string) {
  try {
    parse(schema, data)
  }
  catch (e) {
    throw new Error(`${prefix}: ${(e as Error).message}`)
  }
}

function getSchema(method: string) {
  const schema = rpcSchemas.get(method as any)
  if (!schema)
    throw new Error(`RPC method "${method}" is not defined.`)
  return schema
}

export function validateRpcArgs(method: string, args: any[]) {
  const schema = getSchema(method)
  if (!schema)
    throw new Error(`RPC method "${method}" is not defined.`)

  const { args: argsSchema } = schema
  if (!argsSchema)
    return

  if (argsSchema.length !== args.length)
    throw new Error(`Invalid number of arguments for RPC method "${method}". Expected ${argsSchema.length}, got ${args.length}.`)

  for (let i = 0; i < argsSchema.length; i++) {
    const s = argsSchema[i]
    if (!s)
      continue
    validateSchema(s, args[i], `Invalid argument #${i + 1}`)
  }
}

export function validateRpcReturn(method: string, data: any) {
  const schema = getSchema(method)
  if (!schema)
    throw new Error(`RPC method "${method}" is not defined.`)

  const { returns: returnSchema } = schema
  if (!returnSchema)
    return

  validateSchema(returnSchema, data, `Invalid return value for RPC method "${method}"`)
}
