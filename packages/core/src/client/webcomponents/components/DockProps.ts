import type { DevToolsDockEntry } from '../../../../../kit/src'

export interface DevToolsDockState {
  width: number
  height: number
  top: number
  left: number
  position: 'left' | 'right' | 'bottom' | 'top'
  open: boolean
  minimizePanelInactive: number
  dockEntry?: DevToolsDockEntry
}

export interface DockProps {
  state: DevToolsDockState
  docks: DevToolsDockEntry[]
}
