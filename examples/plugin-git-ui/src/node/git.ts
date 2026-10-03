import { exec } from 'tinyexec'

export interface GitResult {
  stdout: string
  stderr: string
  ok: boolean
}

export async function git(args: string[], cwd: string): Promise<GitResult> {
  try {
    const result = await exec('git', args, { nodeOptions: { cwd }, throwOnError: true })
    return { stdout: result.stdout, stderr: result.stderr, ok: true }
  }
  catch (e: any) {
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? String(e), ok: false }
  }
}

export interface GitState {
  branch: string
  commits: Array<{ hash: string, message: string, author: string, date: string }>
  staged: Array<{ status: string, file: string }>
  unstaged: Array<{ status: string, file: string }>
}

export async function getGitState(gitRoot: string): Promise<GitState> {
  const [branchResult, logResult, statusResult] = await Promise.all([
    git(['branch', '--show-current'], gitRoot),
    git(['log', '--oneline', '-20', '--format=%h\t%s\t%an\t%cr'], gitRoot),
    git(['status', '--porcelain'], gitRoot),
  ])
  const branch = branchResult.stdout
  const log = logResult.stdout
  const status = statusResult.stdout

  const staged: GitState['staged'] = []
  const unstaged: GitState['unstaged'] = []
  for (const line of status.split('\n').filter(Boolean)) {
    const x = line[0] ?? ' '
    const y = line[1] ?? ' '
    const file = line.slice(3)
    if (x !== ' ' && x !== '?')
      staged.push({ status: x, file })
    if (y !== ' ' && y !== '?')
      unstaged.push({ status: y, file })
    if (x === '?')
      unstaged.push({ status: '?', file })
  }

  return {
    branch: branch.trim(),
    commits: log.split('\n').filter(Boolean).map((l) => {
      const parts = l.split('\t')
      return { hash: parts[0] ?? '', message: parts[1] ?? '', author: parts[2] ?? '', date: parts[3] ?? '' }
    }),
    staged,
    unstaged,
  }
}
