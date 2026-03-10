export interface FileExplorerInfo {
  rootDir: string
}

export interface FileExplorerFileEntry {
  path: string
  size: number
  ext: string
}

export interface FileExplorerFileDetail {
  path: string
  content: string
  size: number
}

export interface ResolvedFilePath {
  absolutePath: string
  relativePath: string
}

export interface KitPluginFileExplorerOptions {
  uiBase?: string
  targetDir?: string
}
