import type { Asset as AssetInfo } from '@rolldown/debug'
import type { TreeNode } from 'nanovis'

export type AssetChartInfo = AssetInfo & {
  path: string
  type: 'folder' | 'file'
}
export type AssetChartNode = TreeNode<AssetChartInfo | undefined>
