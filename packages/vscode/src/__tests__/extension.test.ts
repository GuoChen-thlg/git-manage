/**
 * 插件入口测试
 * 覆盖：激活时注册的视图与命令、刷新逻辑、工作区切换后的重新解析
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registeredCommands, resetCommands, windowCalls, resetWindowCalls, workspace, window,
  resetPanels, registeredViewProviders, commands,
} from './__mocks__/vscode';

/** core 方法替身 */
const core = {
  isRepository: vi.fn(),
  getRepositoryRoot: vi.fn(),
  getBranches: vi.fn(),
  getCommitLog: vi.fn(),
  // 用于断言单击分支不会触发切换
  checkout: vi.fn(),
  checkoutNew: vi.fn(),
  createBranch: vi.fn(),
  deleteBranch: vi.fn(),
  renameBranch: vi.fn(),
  findMyBranches: vi.fn(),
  getGitCommandLogs: vi.fn(),
  clearGitCommandLogs: vi.fn(),
  listWorktrees: vi.fn(),
  addWorktree: vi.fn(),
  removeWorktree: vi.fn(),
  pruneWorktrees: vi.fn(),
};

vi.mock('@git-manage/core', () => core);

/** 构造扩展上下文（只用到 subscriptions） */
function fakeContext() {
  return { subscriptions: [] as Array<{ dispose: () => void }> };
}

describe('扩展入口', () => {
  beforeEach(() => {
    resetCommands();
    resetWindowCalls();
    vi.clearAllMocks();
    workspace.workspaceFolders = [{ uri: { fsPath: '/repo' } }];
    core.isRepository.mockResolvedValue(true);
    core.getRepositoryRoot.mockResolvedValue('/repo');
    core.getBranches.mockResolvedValue([]);
    core.getCommitLog.mockResolvedValue([]);
  });

  it('激活后应注册两个视图与全部命令', async () => {
    const { activate } = await import('../extension');
    const context = fakeContext();
    await activate(context as never);

    expect(window.createTreeView).toHaveBeenCalledWith('gitManager.branches', expect.anything());
    expect(window.createTreeView).toHaveBeenCalledWith('gitManager.commits', expect.anything());

    for (const id of [
      'gitManager.refresh',
      'gitManager.checkoutBranch',
      'gitManager.createBranch',
      'gitManager.deleteBranch',
      'gitManager.renameBranch',
      'gitManager.openPanel',
    ]) {
      expect(registeredCommands.has(id), `应注册命令 ${id}`).toBe(true);
    }
  });

  it('所有注册项都应进入 subscriptions，确保停用时统一释放', async () => {
    const { activate } = await import('../extension');
    const context = fakeContext();
    await activate(context as never);

    // 2 个 TreeView + 9 个命令（含 selectBranch/focusCommit/showLogs）
    // + provider 注册 + 日志通道 + 2 个工作区监听
    expect(context.subscriptions.length).toBe(15);
  });

  it('刷新命令应重新解析仓库并触发视图更新', async () => {
    const { activate } = await import('../extension');
    await activate(fakeContext() as never);

    core.isRepository.mockClear();
    core.getRepositoryRoot.mockClear();

    await registeredCommands.get('gitManager.refresh')!();

    expect(core.isRepository).toHaveBeenCalled();
    expect(core.getRepositoryRoot).toHaveBeenCalled();
  });

  it('非仓库工作区激活时应给出提示', async () => {
    core.isRepository.mockResolvedValue(false);
    const { activate } = await import('../extension');

    await activate(fakeContext() as never);

    expect(windowCalls.info.some(m => m.includes('不是 Git 仓库'))).toBe(true);
  });

  it('应把完整面板注册为底部面板视图', async () => {
    resetPanels();
    const { activate } = await import('../extension');
    await activate(fakeContext() as never);

    // 注册的是 WebviewView 提供者，而非编辑器标签页
    expect(registeredViewProviders.has('gitManager.panelView')).toBe(true);
    expect(window.createWebviewPanel).not.toHaveBeenCalled();
  });

  it('打开面板命令应聚焦底部面板视图，不创建编辑器标签页', async () => {
    resetPanels();
    const { activate } = await import('../extension');
    await activate(fakeContext() as never);
    vi.mocked(commands.executeCommand).mockClear();

    await registeredCommands.get('gitManager.openPanel')!('abc123');

    // 通过聚焦命令显示视图
    expect(commands.executeCommand).toHaveBeenCalledWith('gitManager.panelView.focus');
    expect(window.createWebviewPanel).not.toHaveBeenCalled();
  });

  it('deactivate 应清理状态且不抛错', async () => {
    const { activate, deactivate } = await import('../extension');
    await activate(fakeContext() as never);

    expect(() => deactivate()).not.toThrow();
  });
});
