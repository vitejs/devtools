import { onMessage, setNamespace } from 'webext-bridge/window'
import { VITE_DEVTOOLS_NAMESPACE, ViteDevToolsEvent } from './event'

setNamespace(VITE_DEVTOOLS_NAMESPACE)
onMessage(ViteDevToolsEvent.GET_METADATA, () => {
  // TODO (hold-off): get metadata from api endpoint
  return {
    backend: 'websocket',
    websocket: `${location.protocol.replace('http', 'ws')}//${location.hostname}:7812`,
  }
})
