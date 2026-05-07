// Minimum SPA client that talks to a devframe-hosted RPC.
import { connectDevtool } from 'devframe/client'

async function main() {
  const rpc = await connectDevtool()
  // The method names below are just examples — replace with your own.
  const data = await rpc.call('my-inspector:getStats' as any)
  document.getElementById('root')!.textContent = JSON.stringify(data)
}

main().catch(console.error)
