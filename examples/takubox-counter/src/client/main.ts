import { connectDevtool } from 'takubox/client'

async function main() {
  const rpc = await connectDevtool()

  async function refresh() {
    const result = await rpc.call('takubox-counter:get' as any)
    document.getElementById('count')!.textContent = String((result as any).count)
  }

  document.getElementById('bump')!.addEventListener('click', async () => {
    await rpc.call('takubox-counter:increment' as any)
    await refresh()
  })

  await refresh()
}

main().catch((error) => {
  console.error(error)
})
