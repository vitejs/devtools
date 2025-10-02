import { useRpc } from '#imports'
import { ref } from 'vue'

const rpc = useRpc()
export const rawEvents = ref<any>([])

export async function fetchData() {
  rawEvents.value = await rpc.value!['vite:get-payload']()
}
