/**
 * 分支操作流：新建 / 删除 / 远程操作 / 收藏 / 我的分支
 * 从 script.ts 原样迁移
 */

import { state } from './state';
import { toast, showPrompt, showConfirm } from './dialogs';
import { call } from './messaging';
import { loadAll } from './data';
import { renderBranchList, currentBranchName, deleteTargets } from './render-branches';

/**
 * 新建分支
 */
export async function createBranchFlow(): Promise<void> {
  const name = await showPrompt('新分支名称');
  if (!name) return;
  try {
    await call('createBranch', { name: name });
    toast('已创建并切换到 ' + name);
    await loadAll();
  } catch (err) {
    toast('创建分支失败：' + ((err as Error).message || err), true);
  }
}

/**
 * 删除所选分支
 */
export async function deleteBranchFlow(): Promise<void> {
  const targets = deleteTargets();
  if (!targets.length) { toast('请先选择分支', true); return; }
  const current = currentBranchName();
  if (current && targets.indexOf(current) >= 0) {
    toast('当前分支不能删除', true);
    return;
  }

  // 批量时逐个串行删除，单个失败不中断其余分支
  const failed: string[] = [];
  const needForce: string[] = [];

  for (let i = 0; i < targets.length; i += 1) {
    const name = targets[i]!;
    try {
      await call('deleteBranch', { name: name });
    } catch (err) {
      const message = String((err as Error).message || err);
      if (message.indexOf('not fully merged') >= 0) needForce.push(name);
      else failed.push(name);
    }
  }

  // 未合并的分支统一询问一次，避免连续弹窗打扰
  if (needForce.length) {
    const tip = needForce.join('、') + ' 尚未合并，强制删除将丢失其提交，继续？';
    const force = await showConfirm(tip);
    if (force) {
      for (let i = 0; i < needForce.length; i += 1) {
        const name = needForce[i]!;
        try {
          await call('deleteBranch', { name: name, force: true });
        } catch {
          failed.push(name);
        }
      }
    } else {
      for (let i = 0; i < needForce.length; i += 1) failed.push(needForce[i]!);
    }
  }

  const removed = targets.length - failed.length;
  if (failed.length === 0) {
    toast(targets.length > 1 ? '已删除 ' + removed + ' 个分支' : '已删除分支 ' + targets[0]);
  } else if (removed === 0) {
    toast('删除失败：' + failed.join('、'), true);
  } else {
    toast('已删除 ' + removed + ' 个分支，失败：' + failed.join('、'), true);
  }

  state.selectedBranches = new Set();
  state.selectedBranch = null;
  await loadAll();
}

/**
 * 远程操作
 * @param method 方法名
 */
export async function remoteAction(method: 'fetch' | 'pull' | 'push'): Promise<void> {
  const labels: Record<string, string> = { fetch: '获取远程更新', pull: '拉取', push: '推送' };
  try {
    await call(method);
    toast(labels[method]! + ' 完成');
    await loadAll();
  } catch (err) {
    toast(labels[method]! + ' 失败：' + ((err as Error).message || err), true);
  }
}

/**
 * 切换收藏状态（作用于当前选中分支）
 */
export async function toggleFavorite(): Promise<void> {
  const target = state.selectedBranch || currentBranchName();
  if (!target) { toast('请先选择分支', true); return; }
  await toggleFavoriteFor(target);
}

/**
 * 收藏/取消收藏指定分支并持久化
 * @param name 分支名
 */
export async function toggleFavoriteFor(name: string): Promise<void> {
  if (state.favorite.has(name)) state.favorite.delete(name);
  else state.favorite.add(name);

  const list = Array.from(state.favorite);
  renderBranchList();
  const on = state.favorite.has(name);
  toast(on ? '已收藏 ' + name : '已取消收藏 ' + name);
  try {
    await call('saveFavorites', { favorites: list });
  } catch (err) {
    // 保存失败需回滚，避免界面显示已收藏但实际未落盘
    if (on) state.favorite.delete(name);
    else state.favorite.add(name);
    renderBranchList();
    toast('保存收藏失败：' + ((err as Error).message || err), true);
  }
}

/**
 * 切换「只显示我的分支」
 */
export async function toggleMyBranches(): Promise<void> {
  state.onlyMyBranches = !state.onlyMyBranches;
  if (state.onlyMyBranches && state.myBranches.size === 0) {
    try {
      const mine = await call<string[]>('getMyBranches');
      state.myBranches = new Set(mine || []);
    } catch (err) {
      state.onlyMyBranches = false;
      toast('读取我的分支失败：' + ((err as Error).message || err), true);
      renderBranchList();
      return;
    }
  }
  renderBranchList();
}
