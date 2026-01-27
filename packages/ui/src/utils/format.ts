export function formatDuration(ms: number | null | undefined): string[]
export function formatDuration(ms: number | null | undefined, stringify: true): string
export function formatDuration(ms: number | null | undefined, stringify: false): string[]
export function formatDuration(ms: number | null | undefined, stringify?: boolean): string | string[] {
  let duration = []

  if (ms == null)
    duration = ['', '-']
  else if (ms < 1)
    duration = ['<1', 'ms']
  else if (ms < 1000)
    duration = [ms.toFixed(0), 'ms']
  else if (ms < 1000 * 60)
    duration = [(ms / 1000).toFixed(1), 's']
  else
    duration = [(ms / 1000 / 60).toFixed(1), 'min']

  return stringify ? duration.join(' ') : duration
}
