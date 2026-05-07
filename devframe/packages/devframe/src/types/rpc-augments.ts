/**
 * To be extended
 */
export interface DevToolsRpcClientFunctions {
  /**
   * Streaming chunk pushed from server to subscribed clients. Wired by
   * `RpcStreamingHost`; do not register manually.
   *
   * @internal
   */
  'devtoolskit:internal:streaming:chunk': (channel: string, id: string, seq: number, chunk: any) => Promise<void>
  /**
   * Streaming terminator pushed from server to subscribed clients. Wired by
   * `RpcStreamingHost`; do not register manually.
   *
   * @internal
   */
  'devtoolskit:internal:streaming:end': (channel: string, id: string, error?: { name: string, message: string }) => Promise<void>
  /**
   * Server→client cancel for an in-flight upload. Wired by
   * `RpcStreamingHost`; do not register manually.
   *
   * @internal
   */
  'devtoolskit:internal:streaming:upload-cancel': (channel: string, id: string) => Promise<void>
}

/**
 * To be extended
 */
export interface DevToolsRpcServerFunctions {
  /**
   * Client→server streaming subscription with optional replay cursor.
   * Wired by `RpcStreamingHost`; do not register manually.
   *
   * @internal
   */
  'devtoolskit:internal:streaming:subscribe': (channel: string, id: string, opts?: { afterSeq?: number }) => Promise<void>
  /**
   * Client→server streaming unsubscribe. Wired by `RpcStreamingHost`;
   * do not register manually.
   *
   * @internal
   */
  'devtoolskit:internal:streaming:unsubscribe': (channel: string, id: string) => Promise<void>
  /**
   * Client→server streaming cancellation request. Wired by
   * `RpcStreamingHost`; do not register manually.
   *
   * @internal
   */
  'devtoolskit:internal:streaming:cancel': (channel: string, id: string) => Promise<void>
  /**
   * Client→server upload chunk. Wired by `RpcStreamingHost`; do not
   * register manually.
   *
   * @internal
   */
  'devtoolskit:internal:streaming:upload-chunk': (channel: string, id: string, seq: number, chunk: any) => Promise<void>
  /**
   * Client→server upload terminator. Wired by `RpcStreamingHost`; do not
   * register manually.
   *
   * @internal
   */
  'devtoolskit:internal:streaming:upload-end': (channel: string, id: string, error?: { name: string, message: string }) => Promise<void>
}

/**
 * To be extended
 */
export interface DevToolsRpcSharedStates {}
