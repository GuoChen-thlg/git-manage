import { gitExec, gitExecStrict } from './executor.js';
import type { GitCommandOptions, FileChange, FileStatus, StatusResult } from './types.js';

/**
 * 解析文件状态码
 * @param indexStatus - 暂存区状态
 * @param worktreeStatus - 工作区状态
 * @param path - 文件路径
 * @returns 文件状态
 */
function parseFileStatus(indexStatus: string, worktreeStatus: string): FileStatus {
  // 重命名或复制
  if (indexStatus === 'R' || indexStatus === 'C') return 'renamed';
  
  // 已删除
  if (indexStatus === 'D' || worktreeStatus === 'D') return 'deleted';
  
  // 新添加
  if (indexStatus === 'A' || worktreeStatus === '?') return 'added';
  
  // 已修改
  if (indexStatus === 'M' || worktreeStatus === 'M') return 'modified';
  
  // 冲突
  if (indexStatus === 'U' || worktreeStatus === 'U') return 'conflicted';
  
  return 'modified';
}

/**
 * 获取工作区状态
 * @param options - Git 命令选项
 * @returns 状态结果
 */
export async function getStatus(options: GitCommandOptions): Promise<StatusResult> {
  const currentBranch = await getCurrentBranchName(options);
  
  const result = await gitExec('status --porcelain=v1', options);
  
  if (result.exitCode !== 0) {
    return {
      currentBranch,
      changes: [],
      hasChanges: false,
      hasUnstagedChanges: false,
      hasStagedChanges: false,
    };
  }

  const changes: FileChange[] = [];
  let hasUnstagedChanges = false;
  let hasStagedChanges = false;

  for (const line of result.stdout.split('\n')) {
    if (!line.trim()) continue;

    const indexStatus = line[0];
    const worktreeStatus = line[1];
    const path = line.substring(3).trim();

    // 跳过空行
    if (!path) continue;

    const staged = indexStatus !== ' ' && indexStatus !== '?';
    const status = parseFileStatus(indexStatus, worktreeStatus);

    if (staged) hasStagedChanges = true;
    if (worktreeStatus !== ' ' && worktreeStatus !== '?') hasUnstagedChanges = true;

    changes.push({
      path,
      status,
      staged,
    });
  }

  return {
    currentBranch,
    changes,
    hasChanges: changes.length > 0,
    hasUnstagedChanges,
    hasStagedChanges,
  };
}

/**
 * 获取当前分支名称
 * @param options - Git 命令选项
 * @returns 分支名称
 */
async function getCurrentBranchName(options: GitCommandOptions): Promise<string> {
  const result = await gitExec('branch --show-current', options);
  return result.stdout || 'HEAD';
}

/**
 * 暂存文件
 * @param paths - 文件路径列表
 * @param options - Git 命令选项
 */
export async function add(paths: string[], options: GitCommandOptions): Promise<void> {
  if (paths.length === 0) return;
  await gitExecStrict(`add ${paths.join(' ')}`, options);
}

/**
 * 暂存所有更改
 * @param options - Git 命令选项
 */
export async function addAll(options: GitCommandOptions): Promise<void> {
  await gitExecStrict('add -A', options);
}

/**
 * 取消暂存文件
 * @param paths - 文件路径列表
 * @param options - Git 命令选项
 */
export async function unstage(paths: string[], options: GitCommandOptions): Promise<void> {
  if (paths.length === 0) return;
  await gitExecStrict(`reset HEAD -- ${paths.join(' ')}`, options);
}

/**
 * 取消暂存所有更改
 * @param options - Git 命令选项
 */
export async function unstageAll(options: GitCommandOptions): Promise<void> {
  await gitExecStrict('reset HEAD', options);
}

/**
 * 丢弃工作区更改
 * @param path - 文件路径
 * @param options - Git 命令选项
 */
export async function discard(path: string, options: GitCommandOptions): Promise<void> {
  await gitExecStrict(`checkout -- ${path}`, options);
}

/**
 * 丢弃所有工作区更改
 * @param options - Git 命令选项
 */
export async function discardAll(options: GitCommandOptions): Promise<void> {
  await gitExecStrict('checkout -- .', options);
}

/**
 * 暂存更改到 stash
 * @param options - Git 命令选项
 * @param message - stash 消息（可选）
 */
export async function stash(options: GitCommandOptions, message?: string): Promise<void> {
  // 参数数组传参，避免消息含空格/引号时被空白拆分破坏语义
  await gitExecStrict(message ? ['stash', 'push', '-m', message] : ['stash', 'push'], options);
}

/**
 * 恢复最近的 stash
 * @param options - Git 命令选项
 */
export async function stashPop(options: GitCommandOptions): Promise<void> {
  await gitExecStrict('stash pop', options);
}

/**
 * 查看 stash 列表
 * @param options - Git 命令选项
 * @returns stash 列表
 */
export async function stashList(options: GitCommandOptions): Promise<string[]> {
  const result = await gitExec('stash list', options);
  return result.stdout ? result.stdout.split('\n').filter(Boolean) : [];
}

/**
 * 删除最近的 stash
 * @param options - Git 命令选项
 */
export async function stashDrop(options: GitCommandOptions): Promise<void> {
  await gitExecStrict('stash drop', options);
}

/**
 * 提交暂存的更改
 * @param message - 提交信息（可含空格与引号）
 * @param options - Git 命令选项
 */
export async function commit(message: string, options: GitCommandOptions): Promise<void> {
  // 参数数组传参：字符串拼接 + 空白拆分会把带空格消息拆坏并把引号写进 message
  await gitExecStrict(['commit', '-m', message], options);
}

/**
 * 修改最近的提交信息
 * @param message - 新的提交信息（可含空格与引号）
 * @param options - Git 命令选项
 */
export async function amendCommit(message: string, options: GitCommandOptions): Promise<void> {
  await gitExecStrict(['commit', '--amend', '-m', message], options);
}

/**
 * 获取文件内容
 * @param path - 文件路径
 * @param options - Git 命令选项
 * @returns 文件内容
 */
export async function getFileContent(path: string, options: GitCommandOptions): Promise<string> {
  const result = await gitExec(`show HEAD:${path}`, options);
  return result.stdout;
}
