export function promiseWithResolver<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
} {
  let resolve: (value: T) => void | undefined
  let reject: (error: Error) => void | undefined
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  }
}
