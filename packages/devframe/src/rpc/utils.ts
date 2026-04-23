import type { GenericSchema, InferInput } from 'valibot'
import type { RpcArgsSchema, RpcReturnSchema } from './types'

/** Type-level assertion that two types are equal */
export type AssertEqual<X, Y>
  = (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? true : never

/** Infers TypeScript tuple type from Valibot schema array */
export type InferArgsType<S extends RpcArgsSchema | undefined>
  = S extends readonly [] ? []
    : S extends readonly [infer H, ...infer T]
      ? H extends GenericSchema
        ? T extends readonly GenericSchema[]
          ? [InferInput<H>, ...InferArgsType<T>]
          : never
        : never
      : never

/** Infers TypeScript return type from Valibot return schema */
export type InferReturnType<S extends RpcReturnSchema | undefined>
  = S extends RpcReturnSchema
    ? InferInput<S>
    : void
