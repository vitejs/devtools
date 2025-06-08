import type { BirpcGroup, BirpcOptions, ChannelOptions } from 'birpc'

export type RpcServerPresetReturnType = <ClientFunctions, ServerFunctions>(rpc: BirpcGroup<ClientFunctions, ServerFunctions>, options?: Pick<BirpcOptions<ClientFunctions>, 'serialize' | 'deserialize'>) => void
export type RpcServerPresetBasicType = (...args: any[]) => RpcServerPresetReturnType
export type RpcServerPreset<T extends RpcServerPresetBasicType> = (...args: Parameters<T>) => RpcServerPresetReturnType

export function defineRpcServerPreset<T extends RpcServerPresetBasicType>(preset: T): RpcServerPreset<T> {
  return preset
}

export type RpcClientPresetReturnType = Omit<ChannelOptions, 'bind'>
export type RpcClientPresetBasicType = (...args: any[]) => RpcClientPresetReturnType
export type RpcClientPreset<T extends RpcClientPresetBasicType> = (...args: Parameters<T>) => RpcClientPresetReturnType

export function defineRpcClientPreset<T extends RpcClientPresetBasicType>(preset: T): RpcClientPreset<T> {
  return preset
}
