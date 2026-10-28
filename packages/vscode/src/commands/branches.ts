/**
 * 分支与提交相关命令
 * 所有 git 操作都委托给 core，本层只负责用户交互与错误提示。
 */

import * as vscode from 'vscode';
import {
  checkout,
  checkoutNew,
  createBranch,
  deleteBranch,
  getBranches,
  renameBranch,
} from '@git-manage/core';
import { requireRepository } from '../repository';

/** 分支树节点的最小形状（避免与视图模块互相引用） */
interface BranchNodeLike {
  kind: 'branch';
  branch: { name: string; isCurrent: boolean; isRemote: boolean };
}

/**
 * 从命令参数中取出分支信息
 * 支持从树节点或命令面板直接传入
 * @param arg 命令参数
 * @returns 分支名与是否当前分支；无法解析时返回 null
 */
function readBranchArg(arg: unknown): { name: string; isCurrent: boolean } | null {
  if (!arg || typeof arg !== 'object') return null;
  const node = arg as BranchNodeLike;
  if (node.kind !== 'branch' || !node.branch) return null;
  return { name: node.branch.name, isCurrent: node.branch.isCurrent };
}

/**
 * 切换分支
 * @param arg 分支树节点
 */
export async function checkoutBranchCommand(arg?: unknown): Promise<void> {
  const root = await requireRepository();
  if (!root) return;

  const fromTree = readBranchArg(arg);
  let target = fromTree?.name;

  if (!target) {
    // 命令面板调用：让用户从分支列表中选
    try {
      const all = await getBranches(root);
      const picked = await vscode.window.showQuickPick(
        all.map(b => ({ label: b.name, description: b.isRemote ? '远程' : '本地' })),
        { placeHolder: '选择要切换的分支' },
      );
      target = picked?.label;
    } catch (err) {
      void vscode.window.showErrorMessage(`读取分支失败：${err instanceof Error ? err.message : String(err)}`);
      return;
    }
  }
  if (!target) return;

  if (fromTree?.isCurrent) {
    void vscode.window.showInformationMessage(`已经是当前分支：${target}`);
    return;
  }

  try {
    await checkout(target, { cwd: root });
    void vscode.window.showInformationMessage(`已切换到 ${target}`);
    void vscode.commands.executeCommand('gitManager.refresh');
  } catch (err) {
    void vscode.window.showErrorMessage(`切换分支失败：${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * 新建分支
 * 对齐 IDEA：可选择是否在创建后检出
 */
export async function createBranchCommand(): Promise<void> {
  const root = await requireRepository();
  if (!root) return;

  const name = await vscode.window.showInputBox({
    prompt: '新分支名称',
    placeHolder: '例如 feature/login',
    validateInput: (value) => (value.trim() ? undefined : '分支名不能为空'),
  });
  if (!name) return;

  // 与 OpenChamber 面板一致：默认检出，用户可取消
  const checkoutAfter = await vscode.window.showQuickPick(
    [
      { label: '创建并检出', description: '创建后立即切换', value: true },
      { label: '仅创建', description: '不切换当前分支', value: false },
    ],
    { placeHolder: '创建后是否切换到新分支？' },
  );
  if (!checkoutAfter) return;

  try {
    if (checkoutAfter.value) {
      await checkoutNew(name, { cwd: root });
    } else {
      await createBranch(name, { cwd: root });
    }
    void vscode.window.showInformationMessage(
      checkoutAfter.value ? `已创建并切换到 ${name}` : `已创建分支 ${name}`,
    );
    void vscode.commands.executeCommand('gitManager.refresh');
  } catch (err) {
    void vscode.window.showErrorMessage(`创建分支失败：${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * 删除分支
 * 未合并时询问是否强制删除，与 IDEA 一致
 * @param arg 分支树节点
 */
export async function deleteBranchCommand(arg?: unknown): Promise<void> {
  const root = await requireRepository();
  if (!root) return;

  const target = readBranchArg(arg);
  if (!target) {
    void vscode.window.showWarningMessage('请从分支列表中右键选择要删除的分支');
    return;
  }
  if (target.isCurrent) {
    void vscode.window.showWarningMessage('当前分支不能删除');
    return;
  }

  try {
    await deleteBranch(target.name, { cwd: root });
    void vscode.window.showInformationMessage(`已删除分支 ${target.name}`);
    void vscode.commands.executeCommand('gitManager.refresh');
    return;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // 未合并：git 用 -d 会拒绝，询问是否强制删除
    if (message.includes('not fully merged')) {
      const force = await vscode.window.showWarningMessage(
        `${target.name} 尚未合并，强制删除将丢失其提交`,
        { modal: true },
        '强制删除',
      );
      if (force !== '强制删除') return;
      try {
        await deleteBranch(target.name, { cwd: root }, true);
        void vscode.window.showInformationMessage(`已强制删除分支 ${target.name}`);
        void vscode.commands.executeCommand('gitManager.refresh');
      } catch (forceErr) {
        void vscode.window.showErrorMessage(
          `强制删除失败：${forceErr instanceof Error ? forceErr.message : String(forceErr)}`,
        );
      }
      return;
    }
    void vscode.window.showErrorMessage(`删除分支失败：${message}`);
  }
}

/**
 * 重命名分支
 * @param arg 分支树节点
 */
export async function renameBranchCommand(arg?: unknown): Promise<void> {
  const root = await requireRepository();
  if (!root) return;

  const target = readBranchArg(arg);
  if (!target) {
    void vscode.window.showWarningMessage('请从分支列表中右键选择要重命名的分支');
    return;
  }

  const newName = await vscode.window.showInputBox({
    prompt: `重命名 ${target.name}`,
    value: target.name,
    validateInput: (value) => (value.trim() ? undefined : '分支名不能为空'),
  });
  if (!newName || newName === target.name) return;

  try {
    await renameBranch(target.name, newName, { cwd: root });
    void vscode.window.showInformationMessage(`已重命名为 ${newName}`);
    void vscode.commands.executeCommand('gitManager.refresh');
  } catch (err) {
    void vscode.window.showErrorMessage(`重命名失败：${err instanceof Error ? err.message : String(err)}`);
  }
}
