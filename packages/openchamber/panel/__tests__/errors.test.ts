/**
 * 错误提示工具单元测试
 * 覆盖：git 错误归类、错误文本提取、统一失败提示（归类文案/兜底文案/可复制）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { classifyCreateBranchError, classifyGitError, errorText, showOperationError } from '../components/errors';
import { setLocale } from '../i18n';

/** 宿主 toast 断言句柄 */
const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn().mockResolvedValue(undefined) }));

// 宿主模块打桩：避免真实 connectHost 握手，并断言 toast
vi.mock('../host', () => ({
  host: {
    toast: toastMock,
    writeClipboard: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('classifyGitError', () => {
  it('冲突类错误应归类为冲突', () => {
    expect(classifyGitError('CONFLICT (content): Merge conflict in a.ts')).toBe('op.conflict');
  });

  it('认证失败应归类为认证问题', () => {
    expect(classifyGitError('fatal: Authentication failed for repo')).toBe('op.authFailed');
    expect(classifyGitError('Permission denied (publickey)')).toBe('op.authFailed');
  });

  it('网络不可达应归类为不可达', () => {
    expect(classifyGitError('fatal: unable to access: Could not resolve host: github.com')).toBe('op.unreachable');
  });

  it('推送被拒应归类为 rejected', () => {
    expect(classifyGitError('! [rejected] main -> main (non-fast-forward)')).toBe('op.rejected');
  });

  it('无法识别的错误应返回 null', () => {
    expect(classifyGitError('something totally unexpected')).toBeNull();
  });
});

describe('classifyCreateBranchError', () => {
  it('工作区有改动应提示先提交或暂存', () => {
    expect(classifyCreateBranchError('Your local changes would be overwritten by checkout'))
      .toBe('op.branchDirtyWorkingTree');
  });

  it('分支已存在', () => {
    expect(classifyCreateBranchError("fatal: a branch named 'dr' already exists")).toBe('op.branchExists');
  });

  it('分支名非法', () => {
    expect(classifyCreateBranchError("fatal: 'a b' is not a valid branch name")).toBe('op.branchInvalidName');
  });

  it('其他错误走通用文案', () => {
    expect(classifyCreateBranchError('boom')).toBe('op.branchCreateGeneric');
  });
});

describe('errorText', () => {
  it('Error 取 message', () => {
    expect(errorText(new Error('boom'))).toBe('boom');
  });

  it('非 Error 转字符串', () => {
    expect(errorText('plain string')).toBe('plain string');
    expect(errorText(42)).toBe('42');
  });
});

describe('showOperationError', () => {
  beforeEach(() => {
    setLocale('zh-CN');
    // 重置实现：mockRejectedValueOnce 用尽后返回值会变成 undefined
    toastMock.mockReset();
    toastMock.mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('已知类型应使用归类文案并附带原文', () => {
    showOperationError(new Error('CONFLICT in a.ts'), 'op.failed', '[test]', 'op_error');

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'error',
      copy: true,
      dismiss: true,
      message: expect.stringContaining('CONFLICT in a.ts'),
    }));
    // 归类文案打头，而不是兜底文案
    const arg = toastMock.mock.calls.at(-1)![0] as { message: string };
    expect(arg.message).not.toContain('op.failed');
  });

  it('未知类型应使用兜底文案并附带原文', () => {
    showOperationError(new Error('mystery'), 'branch.loadFailed', '[test]', 'load_error');

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'error',
      message: expect.stringContaining('加载分支失败'),
    }));
  });

  it('应写入带前缀与事件名的结构化日志', () => {
    showOperationError(new Error('boom'), 'op.failed', '[my-prefix]', 'my_event');

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('my_event'));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[my-prefix]'));
  });

  it('toast 自身失败时不应抛出', async () => {
    toastMock.mockRejectedValueOnce(new Error('toast 通道不可用'));

    expect(() => showOperationError(new Error('boom'), 'op.failed', '[test]', 'x')).not.toThrow();
    // 等微任务队列冲刷，确认 catch 分支执行且未产生未处理拒绝
    await new Promise(r => setTimeout(r, 0));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('x_toast_error'));
  });

  it('toast 返回非 Promise 时不应崩溃（回归：CI 上 undefined.catch 报错）', () => {
    // 宿主实现或测试 mock 都可能返回非 Promise，不能直接调用 .catch
    toastMock.mockReturnValueOnce(undefined as never);

    expect(() => showOperationError(new Error('boom'), 'op.failed', '[test]', 'x')).not.toThrow();
  });
});
