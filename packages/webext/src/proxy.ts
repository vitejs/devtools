import { allowWindowMessaging, onMessage, sendMessage } from 'webext-bridge/content-script'
import { VITE_DEVTOOLS_NAMESPACE, ViteDevToolsEvent } from './event'

allowWindowMessaging(VITE_DEVTOOLS_NAMESPACE)
onMessage(ViteDevToolsEvent.GET_METADATA, async () => {
  return await sendMessage(ViteDevToolsEvent.GET_METADATA, {}, 'window')
})
