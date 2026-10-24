/**
 * @git-manage/core
 * Git 管理核心逻辑库
 */

// Git 命令执行
export {
  gitExec,
  gitExecStrict,
  isRepository,
  getRepositoryRoot,
  getGitCommandLogs,
  clearGitCommandLogs,
} from './git/executor.js';
export type { GitCommandLog } from './git/executor.js';

// 分支管理
export {
  listBranches,
  getCurrentBranch,
  createBranch,
  deleteBranch,
  localBranchExists,
  isBranchMerged,
  deleteRemoteBranch,
  getBranchTip,
  getBranchUpstream,
  hasOtherLocalBranchTracking,
  setBranchUpstream,
  renameBranch,
  checkout,
  checkoutNew,
  merge,
  rebase,
  rebaseAbort,
  rebaseContinue,
  getBranchDiff,
  getCurrentAuthor,
  findMyBranches,
} from './git/branches.js';

// worktree 管理
export {
  listWorktrees,
  addWorktree,
  removeWorktree,
  pruneWorktrees,
  worktreePathExists,
} from './git/worktree.js';
export type { WorktreeInfo } from './git/worktree.js';

// 提交改写（编辑信息 / 删除提交 / 推送至指定提交）
export {
  isHeadCommit,
  isMergeCommit,
  isWorkingTreeClean,
  uncommitHead,
  rewordCommit,
  dropCommit,
  pushUpToCommit,
} from './git/commit-edit.js';

// 暂存区管理
export {
  getStatus,
  add,
  addAll,
  unstage,
  unstageAll,
  discard,
  discardAll,
  stash,
  stashPop,
  stashList,
  stashDrop,
  commit,
  amendCommit,
  getFileContent,
} from './git/staging.js';

// 差异比较
export {
  getFileDiff,
  getStagedDiff,
  getWorkingDiff,
  getCommitDiff,
  getFileDiffAtCommit,
  getBranchDiffFiles,
} from './git/diff.js';

// 日志历史
export {
  getLog,
  getFileHistory,
  showCommit,
  getBlame,
  getCommitRange,
  getGraphLog,
} from './git/log.js';

// 文件列表
export { listTrackedFiles } from './git/files.js';

// 远程仓库
export {
  listRemotes,
  addRemote,
  removeRemote,
  renameRemote,
  getRemoteUrl,
  setRemoteUrl,
  getRemoteInfo,
  fetch,
  pull,
  push,
  forcePush,
  setUpstream,
} from './git/remote.js';

// 冲突解决
export {
  getConflicts,
  resolveWithCurrent,
  resolveWithIncoming,
  markResolved,
  abortMerge,
  continueMerge,
  abortRebase,
  continueRebase,
  getConflictContent,
  getOursContent,
  getTheirsContent,
  isMerging,
  isRebasing,
} from './git/conflict.js';

// 类型定义
export type {
  GitResult,
  GitCommandOptions,
  Branch,
  FileStatus,
  FileChange,
  StatusResult,
  DiffLine,
  FileDiff,
  Commit,
  CommitDetail,
  BlameLine,
  Remote,
  Conflict,
  LogOptions,
} from './git/types.js';

export { GitError } from './git/types.js';

// ---- 便捷封装函数 ----

import { listBranches as _listBranches } from './git/branches.js';
import { getLog as _getLog, showCommit as _showCommit } from './git/log.js';
import { getCommitDiff as _getCommitDiff } from './git/diff.js';
import type { Branch, Commit, CommitDetail, FileDiff } from './git/types.js';

/**
 * 获取所有分支（本地+远程）
 * @param cwd - 工作目录
 * @returns 分支列表
 */
export async function getBranches(cwd: string): Promise<Branch[]> {
  return _listBranches({ cwd });
}

/**
 * 获取提交历史
 * @param cwd - 工作目录
 * @param limit - 最大返回数量（默认 50）
 * @param branch - 分支名称（可选，按分支过滤日志）
 * @param path - 路径过滤（可选，单个路径或多个路径；多个路径为并集语义，
 *   仅返回触碰任一路径的提交）
 * @returns 提交列表
 */
export async function getCommitLog(cwd: string, limit: number = 50, branch?: string, path?: string | string[]): Promise<Commit[]> {
  return _getLog({ maxCount: limit, branch, path }, { cwd });
}

/**
 * 获取单个提交详情
 * @param cwd - 工作目录
 * @param commitHash - 提交哈希
 * @returns 提交详情
 */
export async function getCommitDetail(cwd: string, commitHash: string): Promise<CommitDetail | null> {
  return _showCommit(commitHash, { cwd });
}

/**
 * 获取提交差异（基于提交哈希）
 * @param cwd - 工作目录
 * @param commitHash - 提交哈希
 * @returns 文件差异列表
 */
export async function getCommitFileDiffs(cwd: string, commitHash: string): Promise<FileDiff[]> {
  const commit = await _showCommit(commitHash, { cwd });
  if (!commit || !commit.parents[0]) {
    return [];
  }
  return _getCommitDiff(commit.parents[0], commitHash, { cwd });
}
