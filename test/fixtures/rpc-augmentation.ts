import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import '@vitejs/devtools-kit'

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcServerFunctions {
    'test:get-modules': (filter?: string) => Promise<string[]>
  }
}

export async function testRpcAugmentation() {
  const rpc = await getDevToolsRpcClient()
  const modules = await rpc.call('test:get-modules', 'src/')

  modules satisfies string[]

  // @ts-expect-error Unknown RPC names remain rejected.
  await rpc.call('test:unknown')
  // @ts-expect-error Registered RPC arguments remain checked.
  await rpc.call('test:get-modules', 42)
}
