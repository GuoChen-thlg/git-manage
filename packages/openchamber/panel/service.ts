/**
 * Service 调用封装
 * 封装与 OpenChamber service 的通信
 */

// SDK 实际导出的宿主类型是 HostClient（含 serviceRequest 方法），不存在 Host 导出
import type { HostClient } from "@openchamber/sdk";
import type { CommitInfo, FileDiff } from "./state";

/** service 调用结果 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** 分支上游跟踪信息 */
export interface BranchUpstream {
  remote: string;
  branch: string;
}

/**
 * 删除分支响应（携带还原所需数据）
 * kind 按删除路由判定：local=本地分支删除，remote=push --delete 远程删除
 */
export interface DeleteBranchResult {
  success: true;
  kind: 'local' | 'remote';
  tip: string;
  upstream: BranchUpstream | null;
  canDeleteTracking: boolean;
}

/** 创建 service 客户端 */
export function createServiceClient(host: HostClient) {
  /**
   * 通用 service 调用
   */
  async function serviceCall<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const result = await host.serviceRequest({
      method: 'POST',
      path: `/${path}`,
      body: JSON.stringify(body),
    });

    if (result.status !== 200) {
      throw new Error(result.body);
    }

    try {
      return JSON.parse(result.body) as T;
    } catch {
      throw new Error(`解析响应失败: ${result.body}`);
    }
  }

  /**
   * 带错误处理的 service 调用
   */
  async function safeServiceCall<T>(
    path: string, 
    body: Record<string, unknown>
  ): Promise<ServiceResult<T>> {
    try {
      const data = await serviceCall<T>(path, body);
      return { success: true, data };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      console.error(`[git-manager] ${path} 调用失败:`, error);
      return { success: false, error };
    }
  }

  // ── 分支相关 API ──

  /** 获取分支列表 */
  async function getBranches(directory: string) {
    return serviceCall<{ name: string; isCurrent: boolean; isRemote: boolean; commit?: string; message?: string }[]>(
      'git-branches',
      { directory }
    );
  }

  /** 切换分支 */
  async function checkoutBranch(directory: string, branch: string) {
    await serviceCall('git-stash', { directory });
    await serviceCall('git-checkout', { directory, branch });
  }

  /** 合并分支 */
  async function mergeBranch(directory: string, branch: string) {
    return serviceCall('git-merge', { directory, branch });
  }

  /**
   * 删除分支
   * @param directory - 仓库目录
   * @param branch - 分支名称
   * @param force - 是否强制删除（true 跳过合并预检；不传时 JSON.stringify 会丢弃该键）
   * @returns 删除结果，含还原所需数据（kind/tip/upstream/canDeleteTracking）
   */
  async function deleteBranch(
    directory: string,
    branch: string,
    force?: boolean
  ): Promise<DeleteBranchResult> {
    return serviceCall<DeleteBranchResult>('git-delete-branch', { directory, branch, force });
  }

  /**
   * 还原已删除的本地分支（按删除前捕获的 tip 重建，可选恢复 upstream）
   * @param directory - 仓库目录
   * @param branch - 分支名称
   * @param tip - 删除前的分支 tip（提交哈希）
   * @param upstream - 上游分支（可选；省略或为空时请求体不带 upstream 键）
   */
  async function restoreBranch(
    directory: string,
    branch: string,
    tip: string,
    upstream?: BranchUpstream | null
  ): Promise<{ success: boolean }> {
    return serviceCall<{ success: boolean }>('git-restore-branch', {
      directory,
      branch,
      tip,
      // undefined/null 不携带该键，与"省略 upstream"语义一致
      ...(upstream ? { upstream } : {}),
    });
  }

  /**
   * 删除远程分支
   * @param directory - 仓库目录
   * @param remote - 远程仓库名称（如 origin）
   * @param branch - 远程分支名称（远程名首段之后的剩余部分）
   */
  async function deleteRemoteBranch(
    directory: string,
    remote: string,
    branch: string
  ): Promise<{ success: boolean }> {
    return serviceCall<{ success: boolean }>('git-delete-remote-branch', { directory, remote, branch });
  }

  /**
   * 创建并切换到新分支
   * @param startPoint 起点提交（可选）：右键选中提交时基于该提交创建，省略则基于当前 HEAD
   */
  async function checkoutNewBranch(directory: string, name: string, startPoint?: string) {
    return serviceCall('git-checkout-new', { directory, name, startPoint });
  }

  /**
   * 创建新分支(仅创建，不切换)
   * @param startPoint 起点提交（可选）：选中提交时基于该提交建分支，省略则基于当前 HEAD
   */
  async function createNewBranch(directory: string, name: string, startPoint?: string) {
    return serviceCall('git-create-branch', { directory, name, startPoint });
  }

  /** 调试日志：上报事件到 service 落盘排查链路，失败静默不影响业务 */
  async function debugLog(event: string, data: Record<string, unknown> = {}): Promise<void> {
    try {
      await serviceCall('git-debug-log', { event, data });
    } catch {
      // 日志通道失败静默
    }
  }

  /** 重命名分支 */
  async function renameBranch(directory: string, oldName: string, newName: string) {
    return serviceCall('git-rename-branch', { directory, oldName, newName });
  }

  /** 变基到指定分支 */
  async function rebaseBranch(directory: string, branch: string) {
    return serviceCall('git-rebase', { directory, branch });
  }

  /** 中止变基 */
  async function rebaseAbort(directory: string) {
    return serviceCall('git-rebase-abort', { directory });
  }

  /** 继续变基 */
  async function rebaseContinue(directory: string) {
    return serviceCall('git-rebase-continue', { directory });
  }

  /** Cherry-pick */
  async function cherryPick(directory: string, hash: string) {
    return serviceCall('git-cherry-pick', { directory, hash });
  }

  // ── 暂存操作 API ──

  /** 暂存更改 */
  async function stash(directory: string) {
    return serviceCall('git-stash-now', { directory });
  }

  // ── 远程操作 API ──

  /** 从远程获取最新引用（fetch origin --prune） */
  async function fetch(directory: string) {
    return serviceCall('git-fetch', { directory });
  }

  /** 拉取远程分支 */
  async function pull(directory: string) {
    return serviceCall('git-pull', { directory });
  }

  /** 推送到远程 */
  async function push(directory: string) {
    return serviceCall('git-push', { directory });
  }

  /** 强制推送到远程 */
  async function forcePush(directory: string) {
    return serviceCall('git-force-push', { directory });
  }

  // ── 提交相关 API ──

  /**
   * 获取提交日志
   * @param directory - 仓库目录
   * @param branch - 分支名称（可选）
   * @param paths - 路径过滤（可选，多选时为 pathspec 数组，按并集过滤；
   *   不传时 JSON.stringify 会丢弃该键，请求体不含 path）
   */
  async function getLog(directory: string, branch?: string, paths?: string[]) {
    return serviceCall<{ hash: string; shortHash: string; message: string; authorName: string; authorEmail: string; date: string; parents: string[] }[]>(
      'git-log',
      { directory, branch, path: paths }
    );
  }

  /** 获取仓库已跟踪文件列表（IDEA 风格路径多选的数据源） */
  async function listFiles(directory: string) {
    return serviceCall<string[]>(
      'git-files',
      { directory }
    );
  }

  /** 获取提交详情 */
  async function getCommitDetail(directory: string, hash: string) {
    return serviceCall<CommitInfo>('git-commit-detail', { directory, hash });
  }

  /** 获取提交差异 */
  async function getCommitDiffs(directory: string, hash: string) {
    return serviceCall<FileDiff[]>('git-commit-diffs', { directory, hash });
  }

  /** 与本地（工作区）比较差异：比较指定提交与当前工作区的差异 */
  async function diffVsLocal(directory: string, hash: string): Promise<FileDiff[]> {
    return serviceCall<FileDiff[]>('git-diff-vs-local', { directory, hash });
  }

  /** 获取分支比较差异 */
  async function getBranchDiff(directory: string, from: string, to: string) {
    return serviceCall('git-branch-diff', { directory, from, to });
  }

  /** 重置分支 */
  async function reset(directory: string, hash: string, mode: 'soft' | 'mixed' | 'hard') {
    return serviceCall('git-reset', { directory, hash, mode });
  }

  /** 回滚提交 */
  async function revert(directory: string, hash: string) {
    return serviceCall('git-revert', { directory, hash });
  }

  /** 撤销提交 */
  async function undoCommit(directory: string, hash: string) {
    return serviceCall('git-undo-commit', { directory, hash });
  }

  // ── 状态相关 API ──

  /** 获取 Git 状态 */
  async function getStatus(directory: string) {
    return serviceCall('git-status', { directory });
  }

  // ── 收藏相关 API ──

  /** 获取收藏列表 */
  async function getFavorites(directory: string) {
    return serviceCall<string[]>('git-favorites-get', { directory });
  }

  /** 保存收藏列表 */
  async function saveFavorites(directory: string, favorites: string[]) {
    return serviceCall('git-favorites-set', { directory, favorites });
  }

  // ── 仓库信息 API ──

  /** 检查是否是 Git 仓库 */
  async function isGitRepository(directory: string) {
    return serviceCall<boolean>('git-is-repo', { directory });
  }

  return {
    serviceCall,
    safeServiceCall,
    getBranches,
    checkoutBranch,
    mergeBranch,
    deleteBranch,
    restoreBranch,
    deleteRemoteBranch,
    checkoutNewBranch,
    createNewBranch,
    debugLog,
    renameBranch,
    rebaseBranch,
    rebaseAbort,
    rebaseContinue,
    cherryPick,
    stash,
    fetch,
    pull,
    push,
    forcePush,
    getLog,
    listFiles,
    getCommitDetail,
    getCommitDiffs,
    diffVsLocal,
    getBranchDiff,
    reset,
    revert,
    undoCommit,
    getStatus,
    getFavorites,
    saveFavorites,
    isGitRepository,
  };
}

/** 服务客户端类型 */
export type ServiceClient = ReturnType<typeof createServiceClient>;
