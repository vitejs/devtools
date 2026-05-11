import launchImpl from 'launch-editor'

/**
 * Open a file in the user's editor.
 *
 * `target` may be a plain path, `file:line`, or `file:line:column`.
 *
 * If `editor` is provided, it is used as the editor command (e.g. `'code'`,
 * `'subl'`) or absolute binary path. Otherwise the editor is auto-detected
 * via the `LAUNCH_EDITOR` env var with a fallback to common defaults.
 */
export function launchEditor(target: string, editor?: string): void {
  launchImpl(target, editor)
}
