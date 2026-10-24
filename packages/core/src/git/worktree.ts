/**
 * Git worktree 操作
 * 提供列出、创建、移除与清理 worktree 的能力。
 */

import { gitExec, gitExecStrict } from './executor.js';
import type { GitCommandOptions } from './types.js';

/** worktree 信息 */
export interface WorktreeInfo {
  /** worktree 绝对路径 */
  path: string;
  /** 当前检出的提交哈希 */
  head: string;
  /** 分支引用（refs/heads/xxx）或 detached 标记 */
  branch: string | null;
  /** 是否为裸仓库 */
  bare: boolean;
  /** 是否处于 detached HEAD */
  detached: boolean;
  /** 是否被锁定及其原因 */
  locked: string | null;
  /** 是否为主工作区 */
  isMain: boolean;
}

/**
 * 列出全部 worktree
 * @param options Git 命令选项
 * @returns worktree 列表（首项为主工作区）
 */
export async function listWorktrees(options: GitCommandOptions): Promise<WorktreeInfo[]> {
  // --porcelain 输出为机器可读格式，每个 worktree 以空行分隔
  const result = await gitExec(['worktree', 'list', '--porcelain'], options);
  const blocks = result.stdout.split('\n\n').map(b => b.trim()).filter(Boolean);

  const list: WorktreeInfo[] = [];
  for (const [index, block] of blocks.entries()) {
    const info: WorktreeInfo = {
      path: '',
      head: '',
      branch: null,
      bare: false,
      detached: false,
      locked: null,
      isMain: index === 0,
    };
    for (const line of block.split('\n')) {
      if (line.startsWith('worktree ')) info.path = line.slice('worktree '.length);
      else if (line.startsWith('HEAD ')) info.head = line.slice('HEAD '.length);
      else if (line.startsWith('branch ')) info.branch = line.slice('branch '.length);
      else if (line === 'bare') info.bare = true;
      else if (line === 'detached') info.detached = true;
      else if (line.startsWith('locked')) info.locked = line.slice('locked'.length).trim() || 'locked';
    }
    if (info.path) list.push(info);
  }
  return list;
}

/**
 * 创建 worktree
 * @param targetPath 新 worktree 的目标路径
 * @param branch 要检出的分支名；不存在时可用 createBranch 直接新建
 * @param createBranch 为 true 时以 -b 新建分支
 * @param startPoint 新建分支的起点（createBranch 为 true 时生效）
 * @param options Git 命令选项
 */
export async function addWorktree(
  targetPath: string,
  branch: string,
  createBranch: boolean,
  startPoint: string | undefined,
  options: GitCommandOptions
): Promise<void> {
  const args = ['worktree', 'add'];
  if (createBranch) args.push('-b', branch);
  args.push(targetPath);
  // createBranch 时 branch 已由 -b 指定，此处只补起点
  if (createBranch) {
    if (startPoint) args.push(startPoint);
  } else {
    args.push(branch);
  }
  await gitExecStrict(args, options);
}

/**
 * 移除 worktree
 * @param targetPath worktree 路径
 * @param force 为 true 时即使有未提交改动也强制移除
 * @param options Git 命令选项
 */
export async function removeWorktree(
  targetPath: string,
  force: boolean,
  options: GitCommandOptions
): Promise<void> {
  const args = ['worktree', 'remove'];
  if (force) args.push('--force');
  args.push(targetPath);
  await gitExecStrict(args, options);
}

/**
 * 清理已失效的 worktree 记录（对应目录已被手工删除的情况）
 * @param options Git 命令选项
 */
export async function pruneWorktrees(options: GitCommandOptions): Promise<void> {
  await gitExecStrict(['worktree', 'prune'], options);
}

/**
 * 判断指定路径是否已被某个 worktree 占用
 * @param targetPath 目标路径
 * @param options Git 命令选项
 * @returns 已占用返回 true
 */
export async function worktreePathExists(
  targetPath: string,
  options: GitCommandOptions
): Promise<boolean> {
  const list = await listWorktrees(options);
  return list.some(w => w.path.replace(/\/$/, '') === targetPath.replace(/\/$/, ''));
}
