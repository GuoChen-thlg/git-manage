/**
 * Git 仓库上下文
 * 负责定位当前工作区的仓库根目录，并把 core 的能力封装成插件可直接调用的形式。
 * 所有 git 操作都经 core 执行（core 已有完整测试覆盖），插件只负责界面与交互。
 */

import * as vscode from 'vscode';
import { isRepository, getRepositoryRoot } from '@git-manage/core';

/**
 * 取当前工作区的仓库根目录
 * 支持多根工作区：优先使用当前激活编辑器所在文件夹
 * @returns 仓库根目录路径；非 git 仓库时返回 null
 */
export async function resolveRepository(): Promise<string | null> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return null;

  // 多根工作区时优先当前编辑文件所在目录
  const activeUri = vscode.window.activeTextEditor?.document.uri;
  if (activeUri) {
    const owner = vscode.workspace.getWorkspaceFolder(activeUri);
    if (owner) {
      const root = await tryResolve(owner.uri.fsPath);
      if (root) return root;
    }
  }

  for (const folder of folders) {
    const root = await tryResolve(folder.uri.fsPath);
    if (root) return root;
  }
  return null;
}

/**
 * 尝试把目录解析成仓库根目录
 * @param dir 目录路径
 * @returns 仓库根目录；失败返回 null
 */
async function tryResolve(dir: string): Promise<string | null> {
  try {
    if (!(await isRepository(dir))) return null;
    return await getRepositoryRoot(dir);
  } catch {
    return null;
  }
}

/**
 * 获取仓库根目录，非仓库时提示用户
 * @returns 仓库根目录；非仓库时返回 null 并提示
 */
export async function requireRepository(): Promise<string | null> {
  const root = await resolveRepository();
  if (!root) {
    void vscode.window.showWarningMessage('当前工作区不是 Git 仓库');
    return null;
  }
  return root;
}
