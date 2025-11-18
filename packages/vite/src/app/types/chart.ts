import type { TreeNode } from 'nanovis'
import type { PackageInfo, PluginBuildInfo, RolldownAssetInfo } from '~~/shared/types'

export type AssetChartInfo = Omit<RolldownAssetInfo, 'type'> & {
  path: string
  type: 'folder' | 'file'
}

export type AssetChartNode = TreeNode<AssetChartInfo | undefined>

export type PackageChartInfo = PackageInfo & {
  path: string
  type: 'folder' | 'package'
}

export type PackageChartNode = TreeNode<PackageChartInfo | undefined>

export type PluginChartInfo = Omit<PluginBuildInfo, 'type' | 'plugin_id' | 'plugin_name'> & {
  type: 'module' | 'hook'
  title: string
  text: string
  children?: any[]
}

export type PluginChartNode = TreeNode<PluginChartInfo | undefined>
