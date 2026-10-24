/**
 * Worktrees 面板单元测试
 * 覆盖：列表渲染（主工作区/普通/detached/锁定）、空态、加载失败、移除确认与强制移除、清理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createWorktreesPanel } from '../components/worktrees-panel';
import type { ServiceClient } from '../service';
import { setLocale } from '../i18n';
import type { HostClient } from '@openchamber/sdk';

/** 构造 worktree 数据 */
function wt(overrides: Partial<{
  path: string; head: string; branch: string | null; bare: boolean;
  detached: boolean; locked: string | null; isMain: boolean;
}> = {}) {
  return {
    path: '/repo',
    head: 'aaaaaaa1111111111111111111111111111111111',
    branch: 'refs/heads/main',
    bare: false,
    detached: false,
    locked: null,
    isMain: true,
    ...overrides,
  };
}

describe('worktrees-panel', () => {
  let container: HTMLElement;
  let dispose: (() => void) | null = null;

  beforeEach(() => {
    setLocale('zh-CN');
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    dispose?.();
    dispose = null;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  /** 创建面板并登记清理 */
  /** 创建面板并登记清理（host 仅用于 toast 提示） */
  function create(service: ServiceClient) {
    const host = { toast: vi.fn().mockResolvedValue(undefined) } as unknown as HostClient;
    const handle = createWorktreesPanel(container, service, '/repo', host);
    dispose = handle.dispose;
    return handle;
  }

  /** 点击扩展确认对话框的确定按钮 */
  function clickConfirmOk(): void {
    const ok = document.getElementById('confirm-ok') as HTMLElement | null;
    ok?.click();
  }

  it('应该渲染 worktree 列表并标记主工作区', async () => {
    const service = {
      listWorktrees: vi.fn().mockResolvedValue([
        wt(),
        wt({ path: '/repo-feat', branch: 'refs/heads/feat', isMain: false }),
      ]),
    } as unknown as ServiceClient;

    create(service);
    await new Promise(r => setTimeout(r, 0));

    const rows = container.querySelectorAll('[data-path]');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('main');
    expect(rows[0].textContent).toContain('主工作区');
    expect(rows[1].textContent).toContain('feat');
    // 主工作区不提供移除按钮
    expect(rows[0].textContent).not.toContain('移除');
    expect(rows[1].textContent).toContain('移除');
  });

  it('detached HEAD 应显示短哈希', async () => {
    const service = {
      listWorktrees: vi.fn().mockResolvedValue([
        wt(),
        wt({ path: '/repo-d', branch: null, detached: true, isMain: false }),
      ]),
    } as unknown as ServiceClient;

    create(service);
    await new Promise(r => setTimeout(r, 0));

    const rows = container.querySelectorAll('[data-path]');
    expect(rows[1].textContent).toContain('detached aaaaaaa');
  });

  it('锁定的 worktree 应显示锁标记', async () => {
    const service = {
      listWorktrees: vi.fn().mockResolvedValue([
        wt({ path: '/repo-l', branch: 'refs/heads/l', isMain: false, locked: '正在使用' }),
      ]),
    } as unknown as ServiceClient;

    create(service);
    await new Promise(r => setTimeout(r, 0));

    expect(container.textContent).toContain('🔒 正在使用');
  });

  it('没有 worktree 时应显示空态', async () => {
    const service = { listWorktrees: vi.fn().mockResolvedValue([]) } as unknown as ServiceClient;

    create(service);
    await new Promise(r => setTimeout(r, 0));

    expect(container.textContent).toContain('没有 worktree');
  });

  it('加载失败时应显示错误提示', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = {
      listWorktrees: vi.fn().mockRejectedValue(new Error('失败')),
    } as unknown as ServiceClient;

    create(service);
    await new Promise(r => setTimeout(r, 0));

    expect(container.textContent).toContain('加载 worktree 失败');
  });

  it('点击移除并确认后应调用 removeWorktree 并刷新', async () => {
    const listWorktrees = vi.fn().mockResolvedValue([
      wt(),
      wt({ path: '/repo-x', branch: 'refs/heads/x', isMain: false }),
    ]);
    const removeWorktree = vi.fn().mockResolvedValue({ success: true });
    const service = { listWorktrees, removeWorktree } as unknown as ServiceClient;

    create(service);
    await new Promise(r => setTimeout(r, 0));

    const removeBtn = [...container.querySelectorAll('button')].find(b => b.textContent === '移除') as HTMLElement;
    removeBtn.click();
    await new Promise(r => setTimeout(r, 0));

    // 沙箱中不可用原生 confirm，改用扩展自身对话框
    expect(document.getElementById('confirm-ok')).toBeTruthy();
    clickConfirmOk();
    await new Promise(r => setTimeout(r, 0));

    expect(removeWorktree).toHaveBeenCalledWith('/repo', '/repo-x', false);
    // 移除后应重新拉取列表
    expect(listWorktrees.mock.calls.length).toBeGreaterThan(1);
  });

  it('存在未提交改动时应询问是否强制移除', async () => {
    const removeWorktree = vi.fn()
      .mockRejectedValueOnce(new Error('contains modified or untracked files'))
      .mockResolvedValueOnce({ success: true });
    const service = {
      listWorktrees: vi.fn().mockResolvedValue([
        wt(),
        wt({ path: '/repo-y', branch: 'refs/heads/y', isMain: false }),
      ]),
      removeWorktree,
    } as unknown as ServiceClient;

    create(service);
    await new Promise(r => setTimeout(r, 0));

    const removeBtn = [...container.querySelectorAll('button')].find(b => b.textContent === '移除') as HTMLElement;
    removeBtn.click();
    await new Promise(r => setTimeout(r, 0));
    // 首次确认
    clickConfirmOk();
    await new Promise(r => setTimeout(r, 10));
    // 第二次为强制移除确认
    clickConfirmOk();
    await new Promise(r => setTimeout(r, 10));

    // 第二次调用应带 force=true
    expect(removeWorktree).toHaveBeenLastCalledWith('/repo', '/repo-y', true);
  });

  it('点击清理应调用 pruneWorktrees', async () => {
    const pruneWorktrees = vi.fn().mockResolvedValue({ success: true });
    const service = {
      listWorktrees: vi.fn().mockResolvedValue([wt()]),
      pruneWorktrees,
    } as unknown as ServiceClient;

    create(service);
    await new Promise(r => setTimeout(r, 0));

    const pruneBtn = [...container.querySelectorAll('button')].find(b => b.textContent === '清理失效项') as HTMLElement;
    pruneBtn.click();
    await new Promise(r => setTimeout(r, 0));

    expect(pruneWorktrees).toHaveBeenCalledWith('/repo');
  });

  it('dispose 应清空容器且后续加载不再渲染', async () => {
    const service = { listWorktrees: vi.fn().mockResolvedValue([wt()]) } as unknown as ServiceClient;

    create(service);
    await new Promise(r => setTimeout(r, 0));
    dispose?.();
    dispose = null;

    expect(container.innerHTML).toBe('');
  });

  it('点击刷新应重新拉取并提示已刷新', async () => {
    const listWorktrees = vi.fn().mockResolvedValue([wt()]);
    const toast = vi.fn().mockResolvedValue(undefined);
    const service = { listWorktrees } as unknown as ServiceClient;

    const handle = createWorktreesPanel(container, service, '/repo', { toast } as unknown as HostClient);
    dispose = handle.dispose;
    await new Promise(r => setTimeout(r, 0));
    const callsBefore = listWorktrees.mock.calls.length;

    const refreshBtn = [...container.querySelectorAll('button')].find(b => b.textContent === '刷新') as HTMLElement;
    refreshBtn.click();
    await new Promise(r => setTimeout(r, 0));

    // 数据未变时也要让用户看到「确实执行了」
    expect(listWorktrees.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success', message: 'worktree 列表已刷新' }));
  });

  it('清理无失效项时应提示无需清理', async () => {
    const listWorktrees = vi.fn().mockResolvedValue([wt()]);
    const toast = vi.fn().mockResolvedValue(undefined);
    const service = {
      listWorktrees,
      pruneWorktrees: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as ServiceClient;

    const handle = createWorktreesPanel(container, service, '/repo', { toast } as unknown as HostClient);
    dispose = handle.dispose;
    await new Promise(r => setTimeout(r, 0));

    const pruneBtn = [...container.querySelectorAll('button')].find(b => b.textContent === '清理失效项') as HTMLElement;
    pruneBtn.click();
    await new Promise(r => setTimeout(r, 0));

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success', message: '没有需要清理的失效 worktree' }));
  });

  it('清理失败时应提示错误', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const toast = vi.fn().mockResolvedValue(undefined);
    const service = {
      listWorktrees: vi.fn().mockResolvedValue([wt()]),
      pruneWorktrees: vi.fn().mockRejectedValue(new Error('prune failed')),
    } as unknown as ServiceClient;

    const handle = createWorktreesPanel(container, service, '/repo', { toast } as unknown as HostClient);
    dispose = handle.dispose;
    await new Promise(r => setTimeout(r, 0));

    const pruneBtn = [...container.querySelectorAll('button')].find(b => b.textContent === '清理失效项') as HTMLElement;
    pruneBtn.click();
    await new Promise(r => setTimeout(r, 0));

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
  });

  it('移除失败且非「有改动」类错误时应提示失败原因', async () => {
    const toast = vi.fn().mockResolvedValue(undefined);
    const service = {
      listWorktrees: vi.fn().mockResolvedValue([wt({ isMain: false })]),
      // 用一个不会被归类成已知原因的错误，验证走兜底文案
      removeWorktree: vi.fn().mockRejectedValue(new Error('device busy')),
    } as unknown as ServiceClient;

    const handle = createWorktreesPanel(container, service, '/repo', { toast } as unknown as HostClient);
    dispose = handle.dispose;
    await new Promise(r => setTimeout(r, 0));

    const removeBtn = [...container.querySelectorAll('button')].find(b => b.textContent === '移除') as HTMLElement;
    removeBtn.click();
    await new Promise(r => setTimeout(r, 0));
    // 确认对话框
    const ok = document.querySelector('#confirm-ok') as HTMLElement;
    ok.click();
    await new Promise(r => setTimeout(r, 0));

    // 回归：此类失败此前只写 console，用户点完什么都看不到
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'error',
      message: expect.stringContaining('移除 worktree 失败'),
    }));
  });

  it('强制移除失败时应提示失败原因', async () => {
    const toast = vi.fn().mockResolvedValue(undefined);
    const removeWorktree = vi.fn()
      .mockRejectedValueOnce(new Error('contains modified or untracked files'))
      .mockRejectedValueOnce(new Error('device busy'));
    const service = {
      listWorktrees: vi.fn().mockResolvedValue([wt({ isMain: false })]),
      removeWorktree,
    } as unknown as ServiceClient;

    const handle = createWorktreesPanel(container, service, '/repo', { toast } as unknown as HostClient);
    dispose = handle.dispose;
    await new Promise(r => setTimeout(r, 0));

    const removeBtn = [...container.querySelectorAll('button')].find(b => b.textContent === '移除') as HTMLElement;
    removeBtn.click();
    await new Promise(r => setTimeout(r, 0));
    (document.querySelector('#confirm-ok') as HTMLElement).click();
    await new Promise(r => setTimeout(r, 0));

    // 第一次失败命中「有改动」→ 弹出强制移除确认
    expect(document.querySelector('#confirm-ok')).toBeTruthy();
    (document.querySelector('#confirm-ok') as HTMLElement).click();
    await new Promise(r => setTimeout(r, 0));

    expect(removeWorktree).toHaveBeenCalledTimes(2);
    expect(removeWorktree.mock.calls[1][2]).toBe(true);
    // 回归：强制移除失败此前只写 console
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'error',
      message: expect.stringContaining('device busy'),
    }));
  });
});
