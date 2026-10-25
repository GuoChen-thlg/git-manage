/**
 * 分支命令测试
 * 覆盖：切换、新建（含是否检出）、删除（含未合并时强制确认）、重命名，
 * 以及非仓库、当前分支等边界场景
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { windowCalls, windowStubs, resetWindowCalls, workspace } from './__mocks__/vscode';

/** core 方法的统一替身 */
const core = {
  isRepository: vi.fn(),
  getRepositoryRoot: vi.fn(),
  getBranches: vi.fn(),
  checkout: vi.fn(),
  checkoutNew: vi.fn(),
  createBranch: vi.fn(),
  deleteBranch: vi.fn(),
  renameBranch: vi.fn(),
};

vi.mock('@git-manage/core', () => core);

/** 仓库根目录 */
const ROOT = '/repo';

/** 构造分支树节点 */
function branchNode(name: string, options: { isCurrent?: boolean; isRemote?: boolean } = {}) {
  return {
    kind: 'branch' as const,
    branch: { name, isCurrent: options.isCurrent ?? false, isRemote: options.isRemote ?? false },
  };
}

describe('分支命令', () => {
  beforeEach(() => {
    resetWindowCalls();
    for (const fn of Object.values(core)) fn.mockReset();
    // 默认处于 git 仓库中：存在工作区文件夹且可解析为仓库根
    workspace.workspaceFolders = [{ uri: { fsPath: ROOT } }];
    core.isRepository.mockReset();
    core.getRepositoryRoot.mockReset();
    core.isRepository.mockResolvedValue(true);
    core.getRepositoryRoot.mockResolvedValue(ROOT);
  });

  describe('切换分支', () => {
    it('应从树节点取分支名并执行切换', async () => {
      core.checkout.mockResolvedValue(undefined);
      const { checkoutBranchCommand } = await import('../commands/branches');

      await checkoutBranchCommand(branchNode('feature'));

      expect(core.checkout).toHaveBeenCalledWith('feature', { cwd: ROOT });
      expect(windowCalls.info.some(m => m.includes('已切换到 feature'))).toBe(true);
    });

    it('切换失败应提示错误原因', async () => {
      core.checkout.mockRejectedValue(new Error('工作区有改动'));
      const { checkoutBranchCommand } = await import('../commands/branches');

      await checkoutBranchCommand(branchNode('feature'));

      expect(windowCalls.error.some(m => m.includes('工作区有改动'))).toBe(true);
    });

    it('已是当前分支时不应执行切换', async () => {
      const { checkoutBranchCommand } = await import('../commands/branches');

      await checkoutBranchCommand(branchNode('main', { isCurrent: true }));

      expect(core.checkout).not.toHaveBeenCalled();
      expect(windowCalls.info.some(m => m.includes('已经是当前分支'))).toBe(true);
    });

    it('无参数调用时应弹出分支选择列表', async () => {
      core.getBranches.mockResolvedValue([
        { name: 'main', isCurrent: true, isRemote: false },
        { name: 'origin/dev', isCurrent: false, isRemote: true },
      ]);
      windowStubs.quickPickResult = { label: 'main', description: '本地' };
      core.checkout.mockResolvedValue(undefined);
      const { checkoutBranchCommand } = await import('../commands/branches');

      await checkoutBranchCommand();

      expect(core.getBranches).toHaveBeenCalledWith(ROOT);
      expect(core.checkout).toHaveBeenCalledWith('main', { cwd: ROOT });
    });

    it('用户取消选择时不应执行切换', async () => {
      core.getBranches.mockResolvedValue([{ name: 'main', isCurrent: false, isRemote: false }]);
      windowStubs.quickPickResult = undefined;
      const { checkoutBranchCommand } = await import('../commands/branches');

      await checkoutBranchCommand();

      expect(core.checkout).not.toHaveBeenCalled();
    });
  });

  describe('新建分支', () => {
    it('选择创建并检出时应调用 checkoutNew', async () => {
      windowStubs.inputBoxResult = 'feature/x';
      windowStubs.quickPickResult = { label: '创建并检出', value: true };
      core.checkoutNew.mockResolvedValue(undefined);
      const { createBranchCommand } = await import('../commands/branches');

      await createBranchCommand();

      expect(core.checkoutNew).toHaveBeenCalledWith('feature/x', { cwd: ROOT });
      expect(windowCalls.info.some(m => m.includes('已创建并切换到 feature/x'))).toBe(true);
    });

    it('选择仅创建时应调用 createBranch，不切换', async () => {
      windowStubs.inputBoxResult = 'feature/y';
      windowStubs.quickPickResult = { label: '仅创建', value: false };
      core.createBranch.mockResolvedValue(undefined);
      const { createBranchCommand } = await import('../commands/branches');

      await createBranchCommand();

      expect(core.createBranch).toHaveBeenCalledWith('feature/y', { cwd: ROOT });
      expect(core.checkoutNew).not.toHaveBeenCalled();
      expect(windowCalls.info.some(m => m.includes('已创建分支 feature/y'))).toBe(true);
    });

    it('分支名为空时不应创建', async () => {
      windowStubs.inputBoxResult = '';
      const { createBranchCommand } = await import('../commands/branches');

      await createBranchCommand();

      expect(core.checkoutNew).not.toHaveBeenCalled();
      expect(core.createBranch).not.toHaveBeenCalled();
    });

    it('创建失败应提示错误', async () => {
      windowStubs.inputBoxResult = 'feature/z';
      windowStubs.quickPickResult = { label: '创建并检出', value: true };
      core.checkoutNew.mockRejectedValue(new Error('分支已存在'));
      const { createBranchCommand } = await import('../commands/branches');

      await createBranchCommand();

      expect(windowCalls.error.some(m => m.includes('分支已存在'))).toBe(true);
    });
  });

  describe('删除分支', () => {
    it('已合并分支应直接删除', async () => {
      core.deleteBranch.mockResolvedValue(undefined);
      const { deleteBranchCommand } = await import('../commands/branches');

      await deleteBranchCommand(branchNode('feature'));

      expect(core.deleteBranch).toHaveBeenCalledWith('feature', { cwd: ROOT });
      expect(windowCalls.info.some(m => m.includes('已删除分支 feature'))).toBe(true);
    });

    it('未合并分支应弹确认，确认后强制删除', async () => {
      core.deleteBranch
        .mockRejectedValueOnce(new Error("error: The branch 'feature' is not fully merged"))
        .mockResolvedValueOnce(undefined);
      windowStubs.warningModalResult = '强制删除';
      const { deleteBranchCommand } = await import('../commands/branches');

      await deleteBranchCommand(branchNode('feature'));

      // 第一次不带 force，第二次带 force
      expect(core.deleteBranch).toHaveBeenNthCalledWith(1, 'feature', { cwd: ROOT });
      expect(core.deleteBranch).toHaveBeenNthCalledWith(2, 'feature', { cwd: ROOT }, true);
      expect(windowCalls.info.some(m => m.includes('已强制删除'))).toBe(true);
    });

    it('未合并时用户取消，不应强制删除', async () => {
      core.deleteBranch.mockRejectedValue(new Error("The branch 'feature' is not fully merged"));
      windowStubs.warningModalResult = undefined;
      const { deleteBranchCommand } = await import('../commands/branches');

      await deleteBranchCommand(branchNode('feature'));

      expect(core.deleteBranch).toHaveBeenCalledTimes(1);
    });

    it('当前分支不应被删除', async () => {
      const { deleteBranchCommand } = await import('../commands/branches');

      await deleteBranchCommand(branchNode('main', { isCurrent: true }));

      expect(core.deleteBranch).not.toHaveBeenCalled();
      expect(windowCalls.warn.some(m => m.includes('当前分支不能删除'))).toBe(true);
    });

    it('未传节点时应提示从列表选择', async () => {
      const { deleteBranchCommand } = await import('../commands/branches');

      await deleteBranchCommand();

      expect(core.deleteBranch).not.toHaveBeenCalled();
      expect(windowCalls.warn.some(m => m.includes('请从分支列表中右键选择'))).toBe(true);
    });

    it('其他错误应提示失败原因', async () => {
      core.deleteBranch.mockRejectedValue(new Error('权限不足'));
      const { deleteBranchCommand } = await import('../commands/branches');

      await deleteBranchCommand(branchNode('feature'));

      expect(windowCalls.error.some(m => m.includes('权限不足'))).toBe(true);
    });
  });

  describe('重命名分支', () => {
    it('应执行重命名并提示', async () => {
      windowStubs.inputBoxResult = 'renamed';
      core.renameBranch.mockResolvedValue(undefined);
      const { renameBranchCommand } = await import('../commands/branches');

      await renameBranchCommand(branchNode('old'));

      expect(core.renameBranch).toHaveBeenCalledWith('old', 'renamed', { cwd: ROOT });
      expect(windowCalls.info.some(m => m.includes('已重命名为 renamed'))).toBe(true);
    });

    it('名称未改变时不应调用 git', async () => {
      windowStubs.inputBoxResult = 'old';
      const { renameBranchCommand } = await import('../commands/branches');

      await renameBranchCommand(branchNode('old'));

      expect(core.renameBranch).not.toHaveBeenCalled();
    });
  });

  describe('非 git 仓库', () => {
    it('所有命令都应给出提示且不执行 git 操作', async () => {
      core.isRepository.mockResolvedValue(false);
      const {
        checkoutBranchCommand, createBranchCommand, deleteBranchCommand, renameBranchCommand,
      } = await import('../commands/branches');

      await checkoutBranchCommand(branchNode('feature'));
      await createBranchCommand();
      await deleteBranchCommand(branchNode('feature'));
      await renameBranchCommand(branchNode('feature'));

      expect(core.checkout).not.toHaveBeenCalled();
      expect(core.deleteBranch).not.toHaveBeenCalled();
      expect(core.renameBranch).not.toHaveBeenCalled();
      expect(windowCalls.warn.some(m => m.includes('不是 Git 仓库'))).toBe(true);
    });
  });
});
