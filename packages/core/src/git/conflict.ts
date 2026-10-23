import { gitExec, gitExecStrict } from './executor.js';
import type { GitCommandOptions, Conflict } from './types.js';

/**
 * 获取冲突文件列表
 * @param options - Git 命令选项
 * @returns 冲突文件列表
 */
export async function getConflicts(options: GitCommandOptions): Promise<Conflict[]> {
  const result = await gitExec('diff --name-only --diff-filter=U', options);

  if (!result.stdout) {
    return [];
  }

  const conflicts: Conflict[] = [];

  for (const path of result.stdout.split('\n')) {
    if (!path.trim()) continue;

    // 简单判断冲突类型
    const type = await detectConflictType(path, options);

    conflicts.push({
      path,
      type,
    });
  }

  return conflicts;
}

/**
 * 检测冲突类型
 * @param path - 文件路径
 * @param options - Git 命令选项
 * @returns 冲突类型
 */
async function detectConflictType(
  path: string,
  options: GitCommandOptions
): Promise<Conflict['type']> {
  const result = await gitExec(`status --porcelain ${path}`, options);
  
  if (!result.stdout) return 'both-modified';

  const status = result.stdout.substring(0, 2);
  
  if (status === 'UU') return 'both-modified';
  if (status === 'AA') return 'both-added';
  if (status === 'DU') return 'deleted-by-us';
  if (status === 'UD') return 'deleted-by-them';
  
  return 'both-modified';
}

/**
 * 解决冲突（使用当前版本）
 * @param path - 文件路径
 * @param options - Git 命令选项
 */
export async function resolveWithCurrent(path: string, options: GitCommandOptions): Promise<void> {
  await gitExecStrict(`checkout --ours ${path}`, options);
  await gitExecStrict(`add ${path}`, options);
}

/**
 * 解决冲突（使用传入版本）
 * @param path - 文件路径
 * @param options - Git 命令选项
 */
export async function resolveWithIncoming(path: string, options: GitCommandOptions): Promise<void> {
  await gitExecStrict(`checkout --theirs ${path}`, options);
  await gitExecStrict(`add ${path}`, options);
}

/**
 * 标记冲突已解决
 * @param path - 文件路径
 * @param options - Git 命令选项
 */
export async function markResolved(path: string, options: GitCommandOptions): Promise<void> {
  await gitExecStrict(`add ${path}`, options);
}

/**
 * 中止合并/变基
 * @param options - Git 命令选项
 */
export async function abortMerge(options: GitCommandOptions): Promise<void> {
  await gitExecStrict('merge --abort', options);
}

/**
 * 继续合并（解决所有冲突后）
 * @param options - Git 命令选项
 */
export async function continueMerge(options: GitCommandOptions): Promise<void> {
  await gitExecStrict('merge --continue', options);
}

/**
 * 中止变基
 * @param options - Git 命令选项
 */
export async function abortRebase(options: GitCommandOptions): Promise<void> {
  await gitExecStrict('rebase --abort', options);
}

/**
 * 继续变基（解决所有冲突后）
 * @param options - Git 命令选项
 */
export async function continueRebase(options: GitCommandOptions): Promise<void> {
  await gitExecStrict('rebase --continue', options);
}

/**
 * 获取冲突文件内容（包含冲突标记）
 * @param path - 文件路径
 * @param options - Git 命令选项
 * @returns 文件内容
 */
export async function getConflictContent(path: string, options: GitCommandOptions): Promise<string> {
  const result = await gitExec(`show :2:${path}`, options);
  return result.stdout;
}

/**
 * 获取当前分支的冲突文件内容
 * @param path - 文件路径
 * @param options - Git 命令选项
 * @returns 文件内容
 */
export async function getOursContent(path: string, options: GitCommandOptions): Promise<string> {
  const result = await gitExec(`show :2:${path}`, options);
  return result.stdout;
}

/**
 * 获取传入分支的冲突文件内容
 * @param path - 文件路径
 * @param options - Git 命令选项
 * @returns 文件内容
 */
export async function getTheirsContent(path: string, options: GitCommandOptions): Promise<string> {
  const result = await gitExec(`show :3:${path}`, options);
  return result.stdout;
}

/**
 * 检查是否处于合并/变基状态
 * @param options - Git 命令选项
 * @returns 是否处于冲突状态
 */
export async function isMerging(options: GitCommandOptions): Promise<boolean> {
  const result = await gitExec('rev-parse --verify MERGE_HEAD', options);
  return result.exitCode === 0;
}

/**
 * 检查是否处于变基状态
 * @param options - Git 命令选项
 * @returns 是否处于变基状态
 */
export async function isRebasing(options: GitCommandOptions): Promise<boolean> {
  const result = await gitExec('rev-parse --verify REBASE_HEAD', options);
  return result.exitCode === 0;
}
