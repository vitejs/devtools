/* eslint-disable unimport/auto-insert */
export interface ViteDevToolsPayload {
  timestamp: number
  hash: string
}

export interface ViteDevToolsHeartbeat {
  status: 'heartbeat'
  heartbeat: number
}

export interface ViteDevToolsError {
  status: 'error'
  error: any
}

export type ViteDevToolsLog
  = ViteDevToolsPayload
    | ViteDevToolsHeartbeat
    | ViteDevToolsError

export type RemoveVoidKeysFromObject<T> = { [K in keyof T]: T[K] extends void ? never : K } extends { [_ in keyof T]: never } ? T : { [K in keyof T as T[K] extends void ? never : K]: T[K] }

export interface ClientFunctions {}
