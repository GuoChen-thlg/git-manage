/**
 * 分支比较视图单元测试
 * 覆盖：双栏 range 查询（当前..目标 / 目标..当前）、提交渲染、空态、
 * 加载失败就地展示、Escape 关闭、重复打开单例、点击提交回调
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showCompareBranchesView } from '../components/compare-view';
import { setLocale } from '../i18n';
import type { CommitInfo } from '../state';
import type { ServiceClient } from '../service';

/** 构造提交数据 */
function commit(hash: string, message: string): CommitInfo {
  return {
    hash,
    shortHash: hash.slice(0, 7),
    message,
    authorName: '测试作者',
    authorEmail: 'test@example.com',
    date: new Date().toISOString(),
    parents: [],
  } as unknown as CommitInfo;
}

/** 等待微任务队列（load 为异步） */
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('compare-view', () => {
  let disposed: (() => void) | null = null;

  beforeEach(() => {
    setLocale('zh-CN');
  });

  afterEach(() => {
    disposed?.();
    disposed = null;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('应该用当前..目标 / 目标..当前 两个 range 查询并渲染各自独有的提交', async () => {
    const getLog = vi.fn(async (_dir: string, range?: string) => {
      if (range === 'main..feature') return [commit('aaaaaaa1', 'feat: 分支独有')];
      if (range === 'feature..main') return [commit('bbbbbbb2', 'fix: 当前独有')];
      return [];
    });
    const service = { getLog } as unknown as ServiceClient;

    const handle = showCompareBranchesView(service, '/repo', 'feature', 'main', () => {});
    disposed = handle.dispose;
    await flush();

    // 两个方向都按 range 表达式查询（与 git log a..b 语义一致）
    const ranges = getLog.mock.calls.map(c => c[1]);
    expect(ranges).toEqual(['main..feature', 'feature..main']);

    const root = document.getElementById('git-compare-branches')!;
    expect(root).toBeTruthy();
    // 标题包含两个分支名
    expect(root.textContent).toContain('feature');
    expect(root.textContent).toContain('main');
    // 上方目标分支独有、下方当前分支独有
    const onlyList = root.querySelector('#compare-only-list')!;
    const currentList = root.querySelector('#compare-current-list')!;
    expect(onlyList.textContent).toContain('feat: 分支独有');
    expect(currentList.textContent).toContain('fix: 当前独有');
    // 计数同步
    expect(root.querySelector('#compare-only-count')!.textContent).toBe('(1)');
    expect(root.querySelector('#compare-current-count')!.textContent).toBe('(1)');
  });

  it('某一侧无提交时应该显示空态提示', async () => {
    const service = {
      getLog: vi.fn(async (_dir: string, range?: string) =>
        range === 'main..feature' ? [commit('aaaaaaa1', 'only')] : []),
    } as unknown as ServiceClient;

    const handle = showCompareBranchesView(service, '/repo', 'feature', 'main', () => {});
    disposed = handle.dispose;
    await flush();

    const root = document.getElementById('git-compare-branches')!;
    expect(root.querySelector('#compare-current-list')!.textContent).toContain('无提交');
    expect(root.querySelector('#compare-current-count')!.textContent).toBe('(0)');
  });

  it('查询失败时应该就地显示错误且视图保持打开', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = {
      getLog: vi.fn(async () => { throw new Error('boom'); }),
    } as unknown as ServiceClient;

    const handle = showCompareBranchesView(service, '/repo', 'feature', 'main', () => {});
    disposed = handle.dispose;
    await flush();

    const root = document.getElementById('git-compare-branches');
    expect(root).toBeTruthy();
    expect(root!.textContent).toContain('分支比较失败');
    expect(root!.textContent).toContain('boom');
  });

  it('点击提交行应该回调 onCommitSelect 并带上该提交', async () => {
    const only = commit('aaaaaaa1', 'feat: 分支独有');
    const service = {
      getLog: vi.fn(async (_dir: string, range?: string) =>
        range === 'main..feature' ? [only] : []),
    } as unknown as ServiceClient;

    const onSelect = vi.fn();
    const handle = showCompareBranchesView(service, '/repo', 'feature', 'main', onSelect);
    disposed = handle.dispose;
    await flush();

    const row = document.querySelector('#compare-only-list [data-hash]') as HTMLElement;
    expect(row).toBeTruthy();
    row.click();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toEqual(only);
  });

  it('Escape 应该关闭视图', async () => {
    const service = { getLog: vi.fn(async () => []) } as unknown as ServiceClient;
    const handle = showCompareBranchesView(service, '/repo', 'feature', 'main', () => {});
    disposed = handle.dispose;
    await flush();

    expect(document.getElementById('git-compare-branches')).toBeTruthy();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.getElementById('git-compare-branches')).toBeNull();
  });

  it('重复打开应该只保留一个视图实例', async () => {
    const service = { getLog: vi.fn(async () => []) } as unknown as ServiceClient;

    const first = showCompareBranchesView(service, '/repo', 'feature', 'main', () => {});
    const second = showCompareBranchesView(service, '/repo', 'other', 'main', () => {});
    disposed = second.dispose;
    first.dispose();
    await flush();

    expect(document.querySelectorAll('#git-compare-branches').length).toBe(1);
  });

  it('dispose 应该幂等且移除视图', async () => {
    const service = { getLog: vi.fn(async () => []) } as unknown as ServiceClient;
    const handle = showCompareBranchesView(service, '/repo', 'feature', 'main', () => {});
    await flush();

    expect(() => {
      handle.dispose();
      handle.dispose();
    }).not.toThrow();
    expect(document.getElementById('git-compare-branches')).toBeNull();
  });
});
