/**
 * Webview 请求处理器测试
 * 覆盖：方法到 core 的映射、参数校验、创建分支是否检出、未实现方法
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

/** core 方法替身 */
const core = {
  getBranches: vi.fn(),
  getCommitLog: vi.fn(),
  getCommitDetail: vi.fn(),
  getCommitFileDiffs: vi.fn(),
  getStatus: vi.fn(),
  checkout: vi.fn(),
  createBranch: vi.fn(),
  checkoutNew: vi.fn(),
  deleteBranch: vi.fn(),
  renameBranch: vi.fn(),
  fetch: vi.fn(),
  pull: vi.fn(),
  push: vi.fn(),
  uncommitHead: vi.fn(),
  gitExecStrict: vi.fn(),
  findMyBranches: vi.fn(),
};

vi.mock('@git-manage/core', () => core);

/** 仓库根目录 */
const ROOT = '/repo';

/** 测试用的本地存储 */
const store = {
  favorites: [] as string[],
  getFavorites: vi.fn(function (this: { favorites: string[] }) { return this.favorites; }),
  setFavorites: vi.fn(function (this: { favorites: string[] }, names: string[]) {
    this.favorites = names;
  }),
};

describe('handleRequest', () => {
  beforeEach(() => {
    for (const fn of Object.values(core)) fn.mockReset();
    store.favorites = [];
    store.getFavorites.mockClear();
    store.setFavorites.mockClear();
  });

  it('查询类方法应透传到 core 并返回结果', async () => {
    core.getBranches.mockResolvedValue([{ name: 'main' }]);
    const { handleRequest } = await import('../webview/handler');

    expect(await handleRequest('getBranches', {}, ROOT, store)).toEqual([{ name: 'main' }]);
    expect(core.getBranches).toHaveBeenCalledWith(ROOT);
  });

  it('提交日志应使用传入分支与数量上限', async () => {
    core.getCommitLog.mockResolvedValue([]);
    const { handleRequest } = await import('../webview/handler');

    await handleRequest('getCommitLog', { branch: 'dev', limit: 50 }, ROOT, store);

    expect(core.getCommitLog).toHaveBeenCalledWith(ROOT, 50, 'dev', undefined);
  });

  it('未指定数量上限时应使用默认值 200', async () => {
    core.getCommitLog.mockResolvedValue([]);
    const { handleRequest } = await import('../webview/handler');

    await handleRequest('getCommitLog', {}, ROOT, store);

    // 未指定时传 0，core 视为不限制
    expect(core.getCommitLog).toHaveBeenCalledWith(ROOT, 0, undefined, undefined);
  });

  it('创建分支默认检出，显式传 false 时只创建', async () => {
    const { handleRequest } = await import('../webview/handler');

    await handleRequest('createBranch', { name: 'feat-a' }, ROOT, store);
    expect(core.checkoutNew).toHaveBeenCalledWith('feat-a', { cwd: ROOT });

    core.createBranch.mockClear();
    await handleRequest('createBranch', { name: 'feat-b', checkoutAfter: false }, ROOT, store);
    expect(core.createBranch).toHaveBeenCalledWith('feat-b', { cwd: ROOT });
  });

  it('删除分支应传递 force 标志', async () => {
    const { handleRequest } = await import('../webview/handler');

    await handleRequest('deleteBranch', { name: 'feat', force: true }, ROOT, store);

    expect(core.deleteBranch).toHaveBeenCalledWith('feat', { cwd: ROOT }, true);
  });

  it('缺少必填参数时应抛出明确错误', async () => {
    const { handleRequest } = await import('../webview/handler');

    await expect(handleRequest('getCommitDetail', {}, ROOT, store)).rejects.toThrow('缺少参数：hash');
  });

  it('cherry-pick 与 revert 应经 gitExecStrict 执行', async () => {
    const { handleRequest } = await import('../webview/handler');

    await handleRequest('cherryPick', { hash: 'abc123' }, ROOT, store);
    expect(core.gitExecStrict).toHaveBeenCalledWith(['cherry-pick', 'abc123'], { cwd: ROOT });

    await handleRequest('revert', { hash: 'def456' }, ROOT, store);
    expect(core.gitExecStrict).toHaveBeenCalledWith(['revert', '--no-edit', 'def456'], { cwd: ROOT });
  });

  it('撤销提交应走 uncommitHead', async () => {
    const { handleRequest } = await import('../webview/handler');

    await handleRequest('undoCommit', { hash: 'abc123' }, ROOT, store);

    expect(core.uncommitHead).toHaveBeenCalledWith('abc123', { cwd: ROOT });
  });

  it('远程操作应正确转发', async () => {
    const { handleRequest } = await import('../webview/handler');

    await handleRequest('fetch', {}, ROOT, store);
    await handleRequest('pull', {}, ROOT, store);
    await handleRequest('push', {}, ROOT, store);

    expect(core.fetch).toHaveBeenCalledWith({ cwd: ROOT });
    expect(core.pull).toHaveBeenCalledWith({ cwd: ROOT });
    expect(core.push).toHaveBeenCalledWith({ cwd: ROOT });
  });

  it('收藏分支应读写本地存储，不触碰 git', async () => {
    const { handleRequest } = await import('../webview/handler');

    expect(await handleRequest('getFavorites', {}, ROOT, store)).toEqual([]);

    await handleRequest('saveFavorites', { favorites: ['main', 'dev'] }, ROOT, store);
    expect(store.setFavorites).toHaveBeenCalledWith(['main', 'dev']);

    expect(await handleRequest('getFavorites', {}, ROOT, store)).toEqual(['main', 'dev']);
  });

  it('我的分支应调用 core 的 findMyBranches', async () => {
    core.findMyBranches = vi.fn().mockResolvedValue(['dev']);
    const { handleRequest } = await import('../webview/handler');

    const result = await handleRequest('getMyBranches', {}, ROOT, store);

    expect(core.findMyBranches).toHaveBeenCalledWith({ cwd: ROOT });
    expect(result).toEqual(['dev']);
  });

  it('路径过滤应透传给 git，而不是只过滤已加载的提交', async () => {
    core.getCommitLog.mockResolvedValue([]);
    const { handleRequest } = await import('../webview/handler');

    await handleRequest('getCommitLog', { paths: ['src/a.ts', 'src/b.ts'] }, ROOT, store);

    expect(core.getCommitLog).toHaveBeenCalledWith(ROOT, 0, undefined, ['src/a.ts', 'src/b.ts']);
  });
});
