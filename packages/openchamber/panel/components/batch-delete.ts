/**
 * 批量删除分支
 * 对齐 IDEA DeleteBranchAction + GitBrancher.deleteBranches 语义：
 *   1. 多选时目标为全部选中分支，未多选时只删单选分支
 *   2. 选中项含当前分支时整体中止（IDEA 表现为动作置灰）
 *   3. 串行逐个删除，单个失败不中断其余分支
 *   4. 批量场景结束时汇总成功与失败
 *
 * 抽出独立模块便于单测：面板主入口有顶层副作用，不适合直接在测试里 import
 */

import type { Branch } from '../state';
import type { ServiceClient } from '../service';
import type { HostClient } from '@openchamber/sdk';
import { t } from '../i18n';
import { performBranchDelete } from './context-menu';

/** 删除目标解析结果 */
export type DeleteTargetsResult =
  /** 解析出待删除分支 */
  | { kind: 'ok'; targets: Branch[] }
  /** 未选中任何分支 */
  | { kind: 'none' }
  /** 选中项含当前分支，整体不可删除 */
  | { kind: 'current' };

/**
 * 解析删除目标
 * @param branches 当前分支列表
 * @param selectedBranch 单选分支
 * @param selectedBranches 多选分支名集合
 * @returns 解析结果
 */
export function resolveDeleteTargets(
  branches: Branch[],
  selectedBranch: Branch | null,
  selectedBranches: Set<string>,
): DeleteTargetsResult {
  // 多选优先：与 IDEA 一致，多选时动作作用于全部选中项
  const targets: Branch[] = selectedBranches.size > 0
    ? [...selectedBranches]
        .map(name => branches.find(b => b.name === name))
        .filter((b): b is Branch => b != null)
    : selectedBranch ? [selectedBranch] : [];

  if (targets.length === 0) return { kind: 'none' };
  // 当前分支不可删除；多选时整体中止，与 IDEA 动作置灰一致
  if (targets.some(b => b.isCurrent)) return { kind: 'current' };
  return { kind: 'ok', targets };
}

/**
 * 批量删除分支
 * 串行逐个删除，单个失败不中断其余分支，批量场景结束时汇总提示
 * @param service 服务客户端
 * @param host 宿主客户端（用于提示）
 * @param directory 仓库目录
 * @param branches 待删除分支
 * @returns 成功删除的数量
 */
export async function deleteBranches(
  service: ServiceClient,
  host: HostClient,
  directory: string,
  branches: Branch[],
): Promise<number> {
  const total = branches.length;
  console.debug(JSON.stringify({
    prefix: '[batch-delete]',
    event: 'start',
    names: branches.map(b => b.name),
  }));

  /** 删除失败的分支名 */
  const failed: string[] = [];

  for (const branch of branches) {
    try {
      // 复用单分支删除流程：内部处理未合并的强制删除对话框与各类错误提示
      const ok = await performBranchDelete(service, directory, branch);
      // 未合并时返回 false：强制删除交由对话框异步完成，这里记为未删除
      if (!ok) failed.push(branch.name);
    } catch (err) {
      // performBranchDelete 正常不会抛错（内部已捕获并提示），这里兜底防中断
      failed.push(branch.name);
      console.error(JSON.stringify({
        prefix: '[batch-delete]',
        event: 'unexpected_error',
        branch: branch.name,
        error: String(err),
      }));
    }
  }

  const removed = total - failed.length;
  console.debug(JSON.stringify({
    prefix: '[batch-delete]',
    event: 'done',
    total,
    removed,
    failed,
  }));

  // 单分支删除的动态反馈已由 performBranchDelete 提供，只在批量场景汇总
  if (total > 1) {
    if (failed.length === 0) {
      void host.toast({ kind: 'success', message: t('branch.batchDeleteDone', { n: removed }) }).catch(() => {});
    } else {
      void host.toast({
        kind: 'error',
        message: t('branch.batchDeletePartial', { ok: removed, failed: failed.join(', ') }),
        copy: true,
        dismiss: true,
      }).catch(() => {});
    }
  }

  return removed;
}
