/**
 * 数据加载：loadAll / loadCommits / loadDetail
 * 从 script.ts 原样迁移
 */

import { log, logDebug, logError } from './dom';
import { state } from './state';
import { toast } from './dialogs';
import { call } from './messaging';
import { renderSidebar } from './render-sidebar';
import { renderBranches } from './render-branches';
import { renderCommits } from './render-commits';
import { renderDetail } from './render-detail';
import { closeActiveDiffPopup } from './diff-popup';
import type { Branch, Commit, CommitDetail, FileDiff } from './protocol';

/**
 * 加载全量数据（分支 + 收藏 + 提交）
 */
export async function loadAll(): Promise<void> {
  state.error = null;
  renderBranches();
  try {
    state.branches = await call<Branch[]>('getBranches');
    // 收藏为本地状态，与分支一起加载，失败不影响主流程
    try {
      const favs = await call<string[]>('getFavorites');
      state.favorite = new Set(favs || []);
    } catch {
      state.favorite = new Set();
    }
    renderSidebar();
    renderBranches();
    await loadCommits(state.selectedBranch || undefined);
  } catch (err) {
    state.error = String((err as Error).message || err);
    renderBranches();
  }
}

/**
 * 加载提交日志
 * @param branch 分支名
 */
export async function loadCommits(branch?: string): Promise<void> {
  try {
    // 路径为单选，交给 git 的 pathspec
    const paths = state.filterPath ? [state.filterPath] : undefined;
    logDebug('panel', 'load_commits', { branch: branch, paths: paths });
    // 取全量历史；保留一个很高的安全上限，避免仓库异常大时一次性拉爆内存
    const loaded = await call<Commit[]>('getCommitLog', { branch: branch, limit: 20000, paths: paths });
    state.commits = loaded || [];
    if (state.commits.length >= 20000) {
      log('warn', 'panel', 'commit_limit_reached', { count: state.commits.length });
    }
    logDebug('panel', 'load_commits_done', { count: state.commits.length });
    renderCommits();
  } catch (err) {
    logError('panel', 'load_commits_failed', { error: String((err as Error) && (err as Error).message ? (err as Error).message : err) });
    toast('读取提交失败：' + ((err as Error).message || err), true);
  }
}

/**
 * 加载提交详情与变更文件
 * @param hash 提交哈希
 */
export async function loadDetail(hash: string): Promise<void> {
  // 重新加载详情时若 diff 弹窗开着则关闭，避免展示过期差异
  closeActiveDiffPopup();
  state.detail = null;
  state.diffs = [];
  renderDetail();
  try {
    const results = await Promise.all([
      call<CommitDetail>('getCommitDetail', { hash: hash }),
      call<FileDiff[]>('getCommitDiffs', { hash: hash }),
    ]);
    state.detail = results[0] ?? null;
    state.diffs = results[1] || [];
    renderDetail();
  } catch (err) {
    toast('读取提交详情失败：' + ((err as Error).message || err), true);
  }
}
