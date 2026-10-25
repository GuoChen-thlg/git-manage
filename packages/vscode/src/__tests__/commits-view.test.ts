/**
 * 提交列表视图测试
 * 覆盖：列表渲染与缓存、点击打开面板命令、非仓库与失败场景
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { windowCalls, resetWindowCalls } from './__mocks__/vscode';
import type { Commit } from '@git-manage/core';

/** 允许用例替换 core 返回的提交列表 */
const mockGetCommitLog = vi.fn();

vi.mock('@git-manage/core', () => ({
  getCommitLog: (...args: unknown[]) => mockGetCommitLog(...args),
}));

/** 构造提交 */
function commit(hash: string, overrides: Partial<Commit> = {}): Commit {
  return {
    hash: `${hash}000000000000000000000000000000000000000`,
    shortHash: hash,
    message: 'feat: 示例提交',
    authorName: '测试用户',
    authorEmail: 'test@example.com',
    date: '2026-01-01 10:00:00 +0800',
    parents: [],
    ...overrides,
  };
}

describe('CommitsProvider', () => {
  /** 被测 provider */
  let provider: import('../views/commits-view').CommitsProvider;
  /** 当前假定的仓库根目录 */
  let root: string | null;

  beforeEach(async () => {
    resetWindowCalls();
    mockGetCommitLog.mockReset();
    root = '/repo';
    const { CommitsProvider } = await import('../views/commits-view');
    provider = new CommitsProvider(() => root);
  });

  afterEach(() => {
    provider.dispose();
  });

  it('应返回 git 提交列表', async () => {
    mockGetCommitLog.mockResolvedValue([commit('abc1234'), commit('def5678')]);
    const commits = await provider.getChildren();
    expect(commits).toHaveLength(2);
    // 未指定筛选分支时传 undefined，由 git 使用当前分支
    expect(mockGetCommitLog).toHaveBeenCalledWith('/repo', 100, undefined);
  });

  it('二次读取应命中缓存，不重复调用 git', async () => {
    mockGetCommitLog.mockResolvedValue([commit('abc1234')]);
    await provider.getChildren();
    await provider.getChildren();
    expect(mockGetCommitLog).toHaveBeenCalledTimes(1);
  });

  it('setBranch 应按指定分支拉取提交', async () => {
    mockGetCommitLog.mockResolvedValue([]);
    provider.setBranch('feat-a');
    await provider.getChildren();
    expect(mockGetCommitLog).toHaveBeenCalledWith('/repo', 100, 'feat-a');
  });

  it('setBranch 传 undefined 应回到当前分支', async () => {
    mockGetCommitLog.mockResolvedValue([]);
    provider.setBranch('feat-a');
    await provider.getChildren();
    provider.setBranch(undefined);
    await provider.getChildren();
    expect(mockGetCommitLog).toHaveBeenLastCalledWith('/repo', 100, undefined);
  });

  it('refresh 后应重新拉取', async () => {
    mockGetCommitLog.mockResolvedValue([commit('abc1234')]);
    await provider.getChildren();
    provider.refresh();
    await provider.getChildren();
    expect(mockGetCommitLog).toHaveBeenCalledTimes(2);
  });

  it('非仓库目录应返回空列表且不调用 git', async () => {
    root = null;
    expect(await provider.getChildren()).toEqual([]);
    expect(mockGetCommitLog).not.toHaveBeenCalled();
  });

  it('读取失败应提示用户并返回空列表', async () => {
    mockGetCommitLog.mockRejectedValue(new Error('git 故障'));
    expect(await provider.getChildren()).toEqual([]);
    expect(windowCalls.error.some(m => m.includes('读取提交历史失败'))).toBe(true);
  });

  it('提交节点应展示摘要、短哈希与作者，并挂上打开面板的命令', async () => {
    const c = commit('abc1234', { message: 'fix: 修复问题', authorName: '张三' });
    const item = provider.getTreeItem(c);

    expect(item.label).toBe('fix: 修复问题');
    expect(item.description).toBe('abc1234 · 张三');
    expect(item.contextValue).toBe('commit');
    expect(item.command?.command).toBe('gitManager.openPanel');
    // 携带提交哈希，供面板定位
    expect(item.command?.arguments?.[0]).toBe(c.hash);
  });

  it('悬停提示应包含完整哈希、作者邮箱与时间', () => {
    const c = commit('abc1234');
    const item = provider.getTreeItem(c);
    expect(item.tooltip).toContain(c.hash);
    expect(item.tooltip).toContain('test@example.com');
    expect(item.tooltip).toContain('2026-01-01');
  });
});
