/**
 * 提交列表视图
 * 用 VS Code 原生 TreeView 展示提交历史，点击在完整面板中查看详情。
 */

import * as vscode from 'vscode';
import { getCommitLog } from '@git-manage/core';
import type { Commit } from '@git-manage/core';

/** 每页拉取的提交数量 */
const PAGE_SIZE = 100;

/**
 * 提交树数据源
 */
export class CommitsProvider implements vscode.TreeDataProvider<Commit> {
  /** 变更通知 */
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<void>();
  /** 供 TreeView 订阅的变更事件 */
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  /** 缓存的提交列表，避免每次展开都请求 git */
  private commits: Commit[] = [];

  /** 当前筛选的分支；undefined 表示当前分支 */
  private branch: string | undefined;

  /** 该 provider 绑定的仓库根目录 */
  constructor(private readonly getRoot: () => string | null) {}

  /**
   * 设置筛选分支并重新拉取
   * 供分支视图单击时调用：只改提交列表，不切换工作区分支
   * @param branch 分支名；undefined 表示回到当前分支
   */
  setBranch(branch: string | undefined): void {
    this.branch = branch;
    this.refresh();
  }

  /** 当前筛选的分支名，用于界面标识 */
  getBranch(): string | undefined {
    return this.branch;
  }

  /** 触发刷新（下次展开重新拉取） */
  refresh(): void {
    this.commits = [];
    this.onDidChangeTreeDataEmitter.fire();
  }

  /**
   * 构造提交节点
   * @param commit 提交
   * @returns 供 TreeView 渲染的节点
   */
  getTreeItem(commit: Commit): vscode.TreeItem {
    const item = new vscode.TreeItem(commit.message, vscode.TreeItemCollapsibleState.None);
    item.contextValue = 'commit';
    item.description = `${commit.shortHash} · ${commit.authorName}`;
    item.tooltip = [
      commit.message,
      '',
      `提交：${commit.hash}`,
      `作者：${commit.authorName} <${commit.authorEmail}>`,
      `时间：${commit.date}`,
    ].join('\n');
    item.iconPath = new vscode.ThemeIcon('git-commit');
    // 点击打开完整面板并定位到该提交
    item.command = {
      command: 'gitManager.openPanel',
      title: '查看提交详情',
      arguments: [commit.hash],
    };
    return item;
  }

  /**
   * 返回子节点
   * @returns 提交列表
   */
  async getChildren(): Promise<Commit[]> {
    const root = this.getRoot();
    if (!root) return [];

    // 已缓存则直接返回，刷新时由 refresh 清空
    if (this.commits.length > 0) return this.commits;

    try {
      this.commits = await getCommitLog(root, PAGE_SIZE, this.branch);
      return this.commits;
    } catch (err) {
      void vscode.window.showErrorMessage(`读取提交历史失败：${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  /**
   * 释放事件发射器
   */
  dispose(): void {
    this.onDidChangeTreeDataEmitter.dispose();
  }
}
