/**
 * 分支树视图测试
 * 覆盖：分组结构与排序、当前分支标记、点击切换命令的挂载与抑制、git 失败时的提示
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TreeItem, ThemeIcon, windowCalls, resetWindowCalls } from './__mocks__/vscode';
import type { Branch } from '@git-manage/core';

/** 允许用例替换 core 返回的分支列表 */
const mockGetBranches = vi.fn();

vi.mock('@git-manage/core', () => ({
  getBranches: (...args: unknown[]) => mockGetBranches(...args),
}));

/** 构造分支 */
function branch(name: string, overrides: Partial<Branch> = {}): Branch {
  return { name, isCurrent: false, isRemote: false, ...overrides };
}

describe('BranchesProvider', () => {
  /** 被测 provider */
  let provider: import('../views/branches-view').BranchesProvider;
  /** 当前假定的仓库根目录 */
  let root: string | null;

  beforeEach(async () => {
    resetWindowCalls();
    mockGetBranches.mockReset();
    root = '/repo';
    const { BranchesProvider } = await import('../views/branches-view');
    provider = new BranchesProvider(() => root);
  });

  afterEach(() => {
    provider.dispose();
  });

  it('根层应返回本地与远程两个分组', async () => {
    mockGetBranches.mockResolvedValue([]);
    const roots = await provider.getChildren();
    expect(roots).toHaveLength(2);
    expect(roots.map(n => (n as { label: string }).label)).toEqual(['本地分支', '远程分支']);
  });

  it('分组下应只返回对应类型的分支并按名称排序', async () => {
    mockGetBranches.mockResolvedValue([
      branch('zeta'),
      branch('alpha'),
      branch('origin/main', { isRemote: true }),
      branch('origin/dev', { isRemote: true }),
    ]);

    const roots = await provider.getChildren();
    const local = await provider.getChildren(roots[0]);
    const remote = await provider.getChildren(roots[1]);

    expect(local.map(n => (n as { branch: Branch }).branch.name)).toEqual(['alpha', 'zeta']);
    expect(remote.map(n => (n as { branch: Branch }).branch.name)).toEqual(['origin/dev', 'origin/main']);
  });

  it('非仓库目录下应返回空列表且不调用 git', async () => {
    root = null;
    const roots = await provider.getChildren();
    expect(roots).toEqual([]);
    expect(mockGetBranches).not.toHaveBeenCalled();
  });

  it('读取分支失败时应提示用户并返回空列表', async () => {
    mockGetBranches.mockRejectedValue(new Error('git 不可用'));
    const roots = await provider.getChildren();
    expect(roots).toEqual([]);
    expect(windowCalls.error.some(m => m.includes('读取分支失败'))).toBe(true);
  });

  it('当前分支应显示实心圆点并标记为当前', async () => {
    mockGetBranches.mockResolvedValue([branch('main', { isCurrent: true, commit: 'abcdef1234567' })]);
    const roots = await provider.getChildren();
    const [node] = await provider.getChildren(roots[0]);

    const item = provider.getTreeItem(node) as TreeItem;
    expect(item.description).toBe('当前分支');
    expect((item.iconPath as ThemeIcon).id).toBe('circle-filled');
  });

  it('单击分支应只筛选提交，绝不触发切换分支（回归）', async () => {
    mockGetBranches.mockResolvedValue([branch('feature', { commit: 'abcdef1234567', message: 'feat: x' })]);
    const roots = await provider.getChildren();
    const [node] = await provider.getChildren(roots[0]);

    const item = provider.getTreeItem(node) as TreeItem;
    expect((item.iconPath as ThemeIcon).id).toBe('git-branch');
    // 关键：单击走筛选命令，不是 checkoutBranch，避免误触切换工作区
    expect(item.command?.command).toBe('gitManager.selectBranch');
    expect(item.command?.command).not.toBe('gitManager.checkoutBranch');
    expect(item.command?.arguments?.[0]).toBe(node);
    // 描述展示最后提交信息
    expect(item.description).toBe('feat: x');
  });

  it('当前分支单击同样只做筛选，不切换', async () => {
    mockGetBranches.mockResolvedValue([branch('main', { isCurrent: true })]);
    const roots = await provider.getChildren();
    const [node] = await provider.getChildren(roots[0]);

    const item = provider.getTreeItem(node) as TreeItem;
    expect(item.command?.command).toBe('gitManager.selectBranch');
  });

  it('本地与远程分支的 contextValue 应区分，供右键菜单匹配', async () => {
    mockGetBranches.mockResolvedValue([
      branch('main'),
      branch('origin/main', { isRemote: true }),
    ]);
    const roots = await provider.getChildren();
    const [local] = await provider.getChildren(roots[0]);
    const [remote] = await provider.getChildren(roots[1]);

    expect(provider.getTreeItem(local).contextValue).toBe('localBranch');
    expect(provider.getTreeItem(remote).contextValue).toBe('remoteBranch');
  });

  it('悬停提示应包含提交短哈希与跟踪信息', async () => {
    mockGetBranches.mockResolvedValue([
      branch('feature', { commit: 'abcdef1234567', upstream: 'origin/feature' }),
    ]);
    const roots = await provider.getChildren();
    const [node] = await provider.getChildren(roots[0]);

    const item = provider.getTreeItem(node) as TreeItem;
    expect(item.tooltip).toContain('abcdef1');
    expect(item.tooltip).toContain('origin/feature');
  });

  it('refresh 应触发 onDidChangeTreeData', async () => {
    const listener = vi.fn();
    provider.onDidChangeTreeData(listener);
    provider.refresh();
    expect(listener).toHaveBeenCalled();
  });
});
