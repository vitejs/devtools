// Shared-iframe soft navigation — the viewer-side half of the host↔iframe
// `postMessage` protocol shipped in `@devframes/hub`. A `subTabs` anchor iframe
// dock owns one live iframe (its `frameId`); the embedded app ships a tiny nav
// shim, and this adapter turns the reported tab manifest into client-only member
// docks and drives the bidirectional nav loop. Re-exported under the kit's
// `DevTools*` names so Vite DevTools wires it without reaching into hub directly.
export {
  attachFrameNavClient as attachDevToolsFrameNav,
  type FrameNavClient as DevToolsFrameNavClient,
  type FrameNavClientOptions as DevToolsFrameNavClientOptions,
  type FrameNavEnvelope as DevToolsFrameNavEnvelope,
  type FrameNavFrameMessage as DevToolsFrameNavFrameMessage,
  type FrameNavHostMessage as DevToolsFrameNavHostMessage,
  type FrameNavHostPayload as DevToolsFrameNavHostPayload,
  type FrameNavListenTarget as DevToolsFrameNavListenTarget,
  type FrameTab as DevToolsFrameTab,
  FRAME_NAV_CHANNEL,
  FRAME_NAV_VERSION,
} from '@devframes/hub/client'
