/**
 * Git 命令执行结果
 */
export interface GitResult {
  /** 标准输出 */
  stdout: string;
  /** 错误输出 */
  stderr: string;
  /** 退出码 */
  exitCode: number;
}

/**
 * Git 错误
 */
export class GitError extends Error {
  constructor(
    message: string,
    public readonly result: GitResult
  ) {
    super(message);
    this.name = 'GitError';
  }
}

/**
 * Git 命令选项
 */
export interface GitCommandOptions {
  /** 工作目录 */
  cwd: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 额外环境变量 */
  env?: Record<string, string>;
}

/**
 * 分支信息
 */
export interface Branch {
  /** 分支名称 */
  name: string;
  /** 是否为当前分支 */
  isCurrent: boolean;
  /** 是否为远程分支 */
  isRemote: boolean;
  /** 远程名称 */
  remote?: string;
  /** 远程跟踪分支 */
  upstream?: string;
  /** 最后提交哈希 */
  commit?: string;
  /** 最后提交信息 */
  message?: string;
  /** 是否有未推送的提交 */
  hasUnpushed?: boolean;
  /** 未推送的提交数量 */
  unpushedCount?: number;
  /** 是否有未拉取的远程提交 */
  hasUnpulled?: boolean;
  /** 未拉取的远程提交数量 */
  unpulledCount?: number;
}

/**
 * 文件状态
 */
export type FileStatus = 
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'untracked'
  | 'conflicted';

/**
 * 文件变更
 */
export interface FileChange {
  /** 文件路径 */
  path: string;
  /** 原始路径（重命名时） */
  oldPath?: string;
  /** 文件状态 */
  status: FileStatus;
  /** 是否已暂存 */
  staged: boolean;
}

/**
 * 工作区状态
 */
export interface StatusResult {
  /** 当前分支 */
  currentBranch: string;
  /** 文件变更列表 */
  changes: FileChange[];
  /** 是否有未提交的更改 */
  hasChanges: boolean;
  /** 是否有未暂存的更改 */
  hasUnstagedChanges: boolean;
  /** 是否有已暂存的更改 */
  hasStagedChanges: boolean;
}

/**
 * 差异行
 */
export interface DiffLine {
  /** 行类型：添加、删除、上下文 */
  type: 'add' | 'delete' | 'context';
  /** 行内容 */
  content: string;
  /** 新文件行号 */
  newLine?: number;
  /** 旧文件行号 */
  oldLine?: number;
}

/**
 * 文件差异
 */
export interface FileDiff {
  /** 文件路径 */
  path: string;
  /** 变更行数 */
  additions: number;
  /** 删除行数 */
  deletions: number;
  /** 差异内容 */
  lines: DiffLine[];
}

/**
 * 提交信息
 */
export interface Commit {
  /** 提交哈希 */
  hash: string;
  /** 短哈希 */
  shortHash: string;
  /** 提交信息 */
  message: string;
  /** 作者姓名 */
  authorName: string;
  /** 作者邮箱 */
  authorEmail: string;
  /** 提交时间 */
  date: string;
  /** 父提交哈希 */
  parents: string[];
}

/**
 * 提交详情
 */
export interface CommitDetail extends Commit {
  /** 提交差异 */
  diffs: FileDiff[];
}

/**
 * Blame 行信息
 */
export interface BlameLine {
  /** 提交哈希 */
  hash: string;
  /** 作者姓名 */
  authorName: string;
  /** 作者邮箱 */
  authorEmail: string;
  /** 提交时间 */
  date: string;
  /** 提交信息 */
  message: string;
  /** 原始行号 */
  originalLine: number;
  /** 当前行号 */
  currentLine: number;
  /** 行内容 */
  content: string;
}

/**
 * 远程仓库
 */
export interface Remote {
  /** 远程名称 */
  name: string;
  /** 远程 URL */
  url: string;
  /** 推送 URL */
  pushUrl?: string;
}

/**
 * 冲突文件
 */
export interface Conflict {
  /** 文件路径 */
  path: string;
  /** 冲突类型 */
  type: 'both-modified' | 'both-added' | 'deleted-by-them' | 'deleted-by-us';
}

/**
 * 日志选项
 */
export interface LogOptions {
  /** 最大返回数量 */
  maxCount?: number;
  /** 起始提交 */
  since?: string;
  /** 结束提交 */
  until?: string;
  /** 文件路径（单个或多个，多选时为 pathspec 数组，多个路径为并集语义） */
  path?: string | string[];
  /** 分支名称 */
  branch?: string;
  /** 是否显示图表 */
  graph?: boolean;
}
