import type { DevToolsDockEntry } from '@vitejs/devtools-kit'

export interface DevToolsFrameState {
  width: number
  height: number
  top: number
  left: number
  position: 'left' | 'right' | 'bottom' | 'top'
  open: boolean
  minimizePanelInactive: number
}

export interface FloatingPanelProps {
  state: DevToolsFrameState
  docks: DevToolsDockEntry[]
}
