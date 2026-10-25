/**
 * 分支树视图
 * 用 VS Code 原生 TreeView 展示本地与远程分支，对齐 IDEA 的分组方式。
 * 点击分支切换，右键提供重命名与删除。
 */

import * as vscode from 'vscode';
import { getBranches } from '@git-manage/core';
import type { Branch } from '@git-manage/core';

/** 树节点：分组或分支 */
type BranchNode = GroupNode | BranchItem;

/** 分组节点 */
interface GroupNode {
  kind: 'group';
  /** 分组类型 */
  group: 'local' | 'remote';
  /** 展示名称 */
  label: string;
}

/** 分支节点 */
interface BranchItem {
  kind: 'branch';
  branch: Branch;
}

/**
 * 分支树数据源
 * 每次刷新重新拉取分支列表，避免状态不一致
 */
export class BranchesProvider implements vscode.TreeDataProvider<BranchNode> {
  /** 变更通知 */
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<void>();
  /** 供 TreeView 订阅的变更事件 */
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  /** 该 provider 绑定的仓库根目录 */
  constructor(private readonly getRoot: () => string | null) {}

  /** 触发刷新 */
  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  /**
   * 构造树节点
   * @param element 节点
   * @returns 供 TreeView 渲染的节点
   */
  getTreeItem(element: BranchNode): vscode.TreeItem {
    if (element.kind === 'group') {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Expanded);
      item.contextValue = 'branchGroup';
      item.iconPath = new vscode.ThemeIcon('folder');
      return item;
    }

    const { branch } = element;
    const item = new vscode.TreeItem(branch.name, vscode.TreeItemCollapsibleState.None);
    // contextValue 决定右键菜单哪些项可见：本地与远程共用后缀，便于删除菜单统一匹配
    item.contextValue = branch.isRemote ? 'remoteBranch' : 'localBranch';
    item.description = branch.isCurrent ? '当前分支' : (branch.message ?? '');
    item.tooltip = [
      branch.name,
      branch.commit ? `提交：${branch.commit.slice(0, 7)}` : '',
      branch.upstream ? `跟踪：${branch.upstream}` : '',
    ].filter(Boolean).join('\n');
    // 当前分支用实心圆点区分，其余为分支图标
    item.iconPath = new vscode.ThemeIcon(branch.isCurrent ? 'circle-filled' : 'git-branch');
    // 单击只筛选提交列表，不切换工作区分支；切换需通过右键菜单显式执行，
    // 避免误触导致工作区文件被改动
    item.command = {
      command: 'gitManager.selectBranch',
      title: '筛选提交',
      arguments: [element],
    };
    return item;
  }

  /**
   * 返回子节点
   * @param element 父节点，省略时为根
   * @returns 子节点列表
   */
  async getChildren(element?: BranchNode): Promise<BranchNode[]> {
    const root = this.getRoot();
    if (!root) return [];

    let branches: Branch[];
    try {
      branches = await getBranches(root);
    } catch (err) {
      void vscode.window.showErrorMessage(`读取分支失败：${err instanceof Error ? err.message : String(err)}`);
      return [];
    }

    if (!element) {
      // 根层：两个分组
      return [
        { kind: 'group', group: 'local', label: '本地分支' },
        { kind: 'group', group: 'remote', label: '远程分支' },
      ];
    }

    if (element.kind === 'group') {
      const wantRemote = element.group === 'remote';
      return branches
        .filter(b => b.isRemote === wantRemote)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(branch => ({ kind: 'branch', branch }) as BranchItem);
    }

    return [];
  }

  /**
   * 释放事件发射器
   */
  dispose(): void {
    this.onDidChangeTreeDataEmitter.dispose();
  }
}
