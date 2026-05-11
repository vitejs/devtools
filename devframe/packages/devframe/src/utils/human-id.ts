import { humanId as humanIdImpl } from 'human-id'

/**
 * Generate a human-readable, lowercase, dash-separated random ID
 * (e.g. `bright-orange-tiger`).
 */
export function humanId(): string {
  return humanIdImpl({ separator: '-', capitalize: false })
}
