export interface TaskNameSelection {
  mode: 'include' | 'exclude'
  names: Set<string>
}

export function isTaskNameSelected(selection: TaskNameSelection, name: string): boolean {
  return selection.mode === 'include' ? selection.names.has(name) : !selection.names.has(name)
}
