export interface Summary {
  number_of_files: number
  number_of_rules: number
  threads_count: number
  start_time: number
  warning_count: number
  error_count: number
  files_with_issues: number
}

export interface LintResultMeta {
  version: string
  timestamp: number
  summary: Summary
}

export interface Label {
  label?: string
  span: {
    offset: number
    length: number
    line: number
    column: number
  }
}

export interface Message {
  message: string
  code: string
  severity: string
  causes: any[]
  url: string
  help: string
  filename: string
  labels: Label[]
  related: any[]
}

export interface LineData {
  line: number
  messages: Message[]
}

export interface FileData {
  filename: string
  source: string
  lines: LineData[]
}

export interface LintResultLogs {
  files: FileData[]
  config: object | null
}
