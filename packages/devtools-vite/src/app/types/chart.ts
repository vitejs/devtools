import type { Asset as AssetInfo } from '@rolldown/debug'
import type { TreeNode } from 'nanovis'
import type { PackageInfo } from '~~/shared/types'

export type AssetChartInfo = AssetInfo & {
  path: string
  type: 'folder' | 'file'
}

export type AssetChartNode = TreeNode<AssetChartInfo | undefined>

export type PackageChartInfo = PackageInfo & {
  path: string
  type: 'folder' | 'package'
}

export type PackageChartNode = TreeNode<PackageChartInfo | undefined>
