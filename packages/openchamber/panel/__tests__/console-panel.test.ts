/**
 * 控制台面板单元测试
 * 覆盖：空态、命令列表渲染、点击查看输出、增量轮询、清空日志、加载失败、dispose 清理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createConsolePanel } from '../components/console-panel';
import { setLocale } from '../i18n';
import type { GitCommandLogEntry, ServiceClient } from '../service';

/** 构造一条命令日志 */
function log(overrides: Partial<GitCommandLogEntry> = {}): GitCommandLogEntry {
  return {
    id: 1,
    startedAt: new Date(2026, 0, 1, 10, 30, 15).getTime(),
    durationMs: 12,
    command: 'git status',
    cwd: '/repo',
    exitCode: 0,
    ok: true,
    stdout: '',
    stderr: '',
    ...overrides,
  };
}

describe('console-panel', () => {
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
    vi.useRealTimers();
  });

  /** 创建面板并登记清理 */
  function create(service: Partial<ServiceClient>) {
    const handle = createConsolePanel(container, service as ServiceClient, '/repo');
    dispose = handle.dispose;
    return handle;
  }

  /** 只保留首屏请求，轮询不触发 */
  function mockLogs(entries: GitCommandLogEntry[]) {
    return vi.fn().mockImplementation((_dir: string, since: number) =>
      Promise.resolve(entries.filter(e => e.id > since)),
    );
  }

  it('没有命令时应显示空态', async () => {
    create({ getCommandLogs: mockLogs([]) });
    await new Promise(r => setTimeout(r, 0));

    expect(container.textContent).toContain('暂无 git 命令');
    expect(container.querySelector('[data-log-count]')?.textContent).toBe('0');
  });

  it('应渲染命令列表与数量，失败命令展示退出码', async () => {
    create({
      getCommandLogs: mockLogs([
        log(),
        log({ id: 2, command: 'git checkout -b dr', ok: false, exitCode: 128 }),
      ]),
    });
    await new Promise(r => setTimeout(r, 0));

    const rows = container.querySelectorAll('[data-log-id]');
    expect(rows.length).toBe(2);
    // 新的在顶部
    expect(rows[0].textContent).toContain('git checkout -b dr');
    expect(rows[0].textContent).toContain('128');
    expect(rows[1].textContent).toContain('git status');
    expect(container.querySelector('[data-log-count]')?.textContent).toBe('2');
  });

  it('默认选中最新命令并展示命令、目录与输出', async () => {
    create({
      getCommandLogs: mockLogs([
        log({ id: 1, command: 'git log', stdout: 'commit aaa' }),
        log({ id: 2, command: 'git status', stdout: 'On branch main' }),
      ]),
    });
    await new Promise(r => setTimeout(r, 0));

    const output = container.querySelector('[data-log-output]')!;
    expect(output.textContent).toContain('$ git status');
    expect(output.textContent).toContain('/repo');
    expect(output.textContent).toContain('On branch main');
  });

  it('点击某条命令应展示其 stderr', async () => {
    create({
      getCommandLogs: mockLogs([
        log({ id: 1, command: 'git checkout -b dr', ok: false, exitCode: 128, stderr: 'Your local changes would be overwritten' }),
        log({ id: 2, command: 'git status', stdout: 'clean' }),
      ]),
    });
    await new Promise(r => setTimeout(r, 0));

    (container.querySelector('[data-log-id="1"]') as HTMLElement).click();
    const output = container.querySelector('[data-log-output]')!;
    expect(output.textContent).toContain('would be overwritten');
  });

  it('轮询应只拉取增量并追加到列表', async () => {
    vi.useFakeTimers();
    const getCommandLogs = vi.fn()
      .mockResolvedValueOnce([log({ id: 1 })])
      .mockResolvedValueOnce([log({ id: 2, command: 'git fetch' })]);

    create({ getCommandLogs });
    await vi.advanceTimersByTimeAsync(0);
    expect(container.querySelectorAll('[data-log-id]').length).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(container.querySelectorAll('[data-log-id]').length).toBe(2);
    // 第二次请求必须带上已拉取到的最大 id
    expect(getCommandLogs).toHaveBeenLastCalledWith('/repo', 1);
  });

  it('点击清空应调用 clearCommandLogs 并清空列表', async () => {
    const clearCommandLogs = vi.fn().mockResolvedValue({ success: true });
    create({ getCommandLogs: mockLogs([log()]), clearCommandLogs });
    await new Promise(r => setTimeout(r, 0));
    expect(container.querySelectorAll('[data-log-id]').length).toBe(1);

    (container.querySelector('[data-log-clear]') as HTMLElement).click();
    await new Promise(r => setTimeout(r, 0));

    expect(clearCommandLogs).toHaveBeenCalledWith('/repo');
    expect(container.querySelectorAll('[data-log-id]').length).toBe(0);
    expect(container.textContent).toContain('暂无 git 命令');
  });

  it('加载失败时应显示错误信息', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    create({ getCommandLogs: vi.fn().mockRejectedValue(new Error('service 未启动')) });
    await new Promise(r => setTimeout(r, 0));

    expect(container.querySelector('[data-log-output]')!.textContent).toContain('读取命令日志失败');
    expect(container.querySelector('[data-log-output]')!.textContent).toContain('service 未启动');
  });

  it('dispose 应清空容器并停止轮询', async () => {
    vi.useFakeTimers();
    const getCommandLogs = mockLogs([log()]);
    create({ getCommandLogs });
    await vi.advanceTimersByTimeAsync(0);

    const callsBefore = getCommandLogs.mock.calls.length;
    dispose!();
    dispose = null;
    await vi.advanceTimersByTimeAsync(3000);

    expect(container.innerHTML).toBe('');
    expect(getCommandLogs.mock.calls.length).toBe(callsBefore);
  });

  it('不应覆盖容器的高度（否则页签切换后面板不可见）', async () => {
    container.style.height = '220px';
    create({ getCommandLogs: mockLogs([]) });
    await new Promise(r => setTimeout(r, 0));

    expect(container.style.height).toBe('220px');
  });
});
