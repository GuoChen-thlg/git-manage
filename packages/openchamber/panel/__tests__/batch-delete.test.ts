/**
 * 批量删除分支单元测试
 * 覆盖：目标解析（多选优先/单选/当前分支中止）、串行删除、单个失败不中断、结果汇总提示
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deleteBranches, resolveDeleteTargets } from '../components/batch-delete';
import { setLocale } from '../i18n';
import type { Branch } from '../state';
import type { ServiceClient } from '../service';
import type { HostClient } from '@openchamber/sdk';

/** 构造分支 */
function branch(name: string, overrides: Partial<Branch> = {}): Branch {
  return { name, isCurrent: false, isRemote: false, ...overrides };
}

describe('resolveDeleteTargets', () => {
  const branches = [
    branch('main', { isCurrent: true }),
    branch('feat-a'),
    branch('feat-b'),
    branch('feat-c'),
  ];

  it('多选时应返回全部选中分支（回归：曾只删第一条）', () => {
    const res = resolveDeleteTargets(branches, null, new Set(['feat-a', 'feat-b', 'feat-c']));
    expect(res.kind).toBe('ok');
    expect(res.kind === 'ok' && res.targets.map(b => b.name).sort()).toEqual(['feat-a', 'feat-b', 'feat-c']);
  });

  it('未多选时应只返回单选分支', () => {
    const res = resolveDeleteTargets(branches, branch('feat-a'), new Set());
    expect(res.kind).toBe('ok');
    expect(res.kind === 'ok' && res.targets.map(b => b.name)).toEqual(['feat-a']);
  });

  it('多选优先于单选', () => {
    const res = resolveDeleteTargets(branches, branch('feat-c'), new Set(['feat-a', 'feat-b']));
    expect(res.kind === 'ok' && res.targets.map(b => b.name).sort()).toEqual(['feat-a', 'feat-b']);
  });

  it('多选包含当前分支时应整体中止', () => {
    expect(resolveDeleteTargets(branches, null, new Set(['main', 'feat-a'])).kind).toBe('current');
  });

  it('单选当前分支时应中止', () => {
    expect(resolveDeleteTargets(branches, branch('main', { isCurrent: true }), new Set()).kind).toBe('current');
  });

  it('未选中任何分支时应返回 none', () => {
    expect(resolveDeleteTargets(branches, null, new Set()).kind).toBe('none');
  });

  it('多选名称在列表中已不存在时应忽略', () => {
    const res = resolveDeleteTargets(branches, null, new Set(['gone', 'feat-a']));
    expect(res.kind === 'ok' && res.targets.map(b => b.name)).toEqual(['feat-a']);
  });
});

describe('deleteBranches', () => {
  let toast: ReturnType<typeof vi.fn>;
  let host: HostClient;

  beforeEach(() => {
    setLocale('zh-CN');
    toast = vi.fn().mockResolvedValue(undefined);
    host = { toast } as unknown as HostClient;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应逐个删除全部选中的分支（回归：曾只删一个）', async () => {
    const deleteBranch = vi.fn().mockResolvedValue({
      success: true, kind: 'local', tip: 'abc', upstream: null, canDeleteTracking: false,
    });
    const service = {
      deleteBranch,
      getBranches: vi.fn().mockResolvedValue([]),
    } as unknown as ServiceClient;

    const removed = await deleteBranches(service, host, '/repo', [
      branch('feat-a'), branch('feat-b'), branch('feat-c'),
    ]);

    expect(deleteBranch).toHaveBeenCalledTimes(3);
    expect(deleteBranch.mock.calls.map(c => c[1])).toEqual(['feat-a', 'feat-b', 'feat-c']);
    expect(removed).toBe(3);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'success',
      message: '已删除 3 个分支',
    }));
  });

  it('单个分支失败不应中断其余分支', async () => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const deleteBranch = vi.fn().mockImplementation((_dir: string, name: string) => {
      if (name === 'feat-b') return Promise.reject(new Error('boom'));
      return Promise.resolve({ success: true, kind: 'local', tip: 'abc', upstream: null, canDeleteTracking: false });
    });
    const service = {
      deleteBranch,
      getBranches: vi.fn().mockResolvedValue([]),
    } as unknown as ServiceClient;

    const removed = await deleteBranches(service, host, '/repo', [
      branch('feat-a'), branch('feat-b'), branch('feat-c'),
    ]);

    // 三个都被尝试，成功两个
    expect(deleteBranch).toHaveBeenCalledTimes(3);
    expect(removed).toBe(2);
    // 汇总提示里应点名失败的分支
    const lastToast = toast.mock.calls.at(-1)?.[0] as { kind: string; message: string };
    expect(lastToast.kind).toBe('error');
    expect(lastToast.message).toContain('已删除 2 个分支');
    expect(lastToast.message).toContain('feat-b');
  });

  it('单分支删除时不给批量汇总提示', async () => {
    const deleteBranch = vi.fn().mockResolvedValue({
      success: true, kind: 'local', tip: 'abc', upstream: null, canDeleteTracking: false,
    });
    const service = {
      deleteBranch,
      getBranches: vi.fn().mockResolvedValue([]),
    } as unknown as ServiceClient;

    await deleteBranches(service, host, '/repo', [branch('feat-a')]);

    const summary = toast.mock.calls.filter(([arg]) =>
      String((arg as { message: string }).message).includes('已删除'));
    expect(summary.length).toBe(0);
  });

  it('未合并分支（返回 false）应计入失败', async () => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    const service = {
      deleteBranch: vi.fn().mockRejectedValue(
        // 服务端返回 NOT_MERGED，会弹出强制删除对话框且返回 false
        Object.assign(new Error(JSON.stringify({ code: 'NOT_MERGED', message: 'not merged' })), {
          response: { status: 409, body: JSON.stringify({ code: 'NOT_MERGED', message: 'not merged' }) },
        }),
      ),
      getBranches: vi.fn().mockResolvedValue([]),
    } as unknown as ServiceClient;

    const removed = await deleteBranches(service, host, '/repo', [branch('feat-a'), branch('feat-b')]);

    expect(removed).toBe(0);
  });
});
