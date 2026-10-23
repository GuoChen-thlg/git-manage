import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServiceClient } from '../service';

// 模拟 host 对象
const mockHost = {
  serviceRequest: vi.fn(),
};

describe('service', () => {
  let service: ReturnType<typeof createServiceClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createServiceClient(mockHost as any);
  });

  describe('serviceCall', () => {
    it('应该发送请求并返回解析后的结果', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify({ data: 'test' }),
      });

      const result = await service.serviceCall('test-endpoint', { key: 'value' });

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/test-endpoint',
        body: JSON.stringify({ key: 'value' }),
      });
      expect(result).toEqual({ data: 'test' });
    });

    it('应该在非 200 状态时抛出错误', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 500,
        body: 'Internal Server Error',
      });

      await expect(
        service.serviceCall('test-endpoint', {})
      ).rejects.toThrow('Internal Server Error');
    });

    it('应该在 JSON 解析失败时抛出错误', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: 'invalid json',
      });

      await expect(
        service.serviceCall('test-endpoint', {})
      ).rejects.toThrow('解析响应失败');
    });
  });

  describe('safeServiceCall', () => {
    it('应该返回成功结果', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify({ data: 'test' }),
      });

      const result = await service.safeServiceCall('test-endpoint', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ data: 'test' });
      expect(result.error).toBeUndefined();
    });

    it('应该返回失败结果', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 500,
        body: 'Error',
      });

      const result = await service.safeServiceCall('test-endpoint', {});

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });

  describe('getBranches', () => {
    it('应该获取分支列表', async () => {
      const mockBranches = [
        { name: 'main', isCurrent: true, isRemote: false },
        { name: 'feature/test', isCurrent: false, isRemote: false },
      ];

      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(mockBranches),
      });

      const branches = await service.getBranches('/path/to/repo');

      expect(branches).toEqual(mockBranches);
      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-branches',
        body: JSON.stringify({ directory: '/path/to/repo' }),
      });
    });
  });

  describe('checkoutBranch', () => {
    it('应该签出分支', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.checkoutBranch('/path/to/repo', 'feature/test');

      expect(mockHost.serviceRequest).toHaveBeenCalledTimes(2);
      expect(mockHost.serviceRequest).toHaveBeenNthCalledWith(1, {
        method: 'POST',
        path: '/git-stash',
        body: JSON.stringify({ directory: '/path/to/repo' }),
      });
      expect(mockHost.serviceRequest).toHaveBeenNthCalledWith(2, {
        method: 'POST',
        path: '/git-checkout',
        body: JSON.stringify({ directory: '/path/to/repo', branch: 'feature/test' }),
      });
    });
  });

  describe('mergeBranch', () => {
    it('应该合并分支', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.mergeBranch('/path/to/repo', 'feature/test');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-merge',
        body: JSON.stringify({ directory: '/path/to/repo', branch: 'feature/test' }),
      });
    });
  });

  describe('deleteBranch', () => {
    it('应该删除分支', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.deleteBranch('/path/to/repo', 'feature/test');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-delete-branch',
        body: JSON.stringify({ directory: '/path/to/repo', branch: 'feature/test' }),
      });
    });

    it('deleteBranch 传 force=true 时请求体应携带 force', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.deleteBranch('/path/to/repo', 'feature/test', true);

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-delete-branch',
        body: JSON.stringify({ directory: '/path/to/repo', branch: 'feature/test', force: true }),
      });
      // 请求体解析后 force 应为布尔 true
      const bodyText = mockHost.serviceRequest.mock.calls[0][0].body as string;
      expect(JSON.parse(bodyText).force).toBe(true);
    });

    it('不传 force 时请求体不应包含 force 字段', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.deleteBranch('/path/to/repo', 'feature/test');

      // JSON.stringify 会丢弃值为 undefined 的 force 键，body 中不出现 force
      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-delete-branch',
        body: JSON.stringify({ directory: '/path/to/repo', branch: 'feature/test' }),
      });
      const bodyText = mockHost.serviceRequest.mock.calls[0][0].body as string;
      expect(bodyText).not.toContain('"force"');
    });
  });

  describe('deleteBranch 返回体', () => {
    it('deleteBranch 应将响应解析为 DeleteBranchResult 并透传还原数据', async () => {
      const mockResult = {
        success: true,
        kind: 'local',
        tip: '1234567890abcdef1234567890abcdef12345678',
        upstream: { remote: 'origin', branch: 'dev' },
        canDeleteTracking: false,
      };
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(mockResult),
      });

      const result = await service.deleteBranch('/path/to/repo', 'dev', true);

      expect(result).toEqual(mockResult);
      expect(result.success).toBe(true);
      expect(result.kind).toBe('local');
      expect(result.tip).toBe('1234567890abcdef1234567890abcdef12345678');
      expect(result.upstream).toEqual({ remote: 'origin', branch: 'dev' });
      expect(result.canDeleteTracking).toBe(false);
    });

    it('deleteBranch 远程删除结果 kind=remote、upstream 为 null 也应透传', async () => {
      const mockResult = {
        success: true,
        kind: 'remote',
        tip: 'abcdef1234567890abcdef1234567890abcdef12',
        upstream: null,
        canDeleteTracking: false,
      };
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(mockResult),
      });

      const result = await service.deleteBranch('/path/to/repo', 'origin/dev');

      expect(result).toEqual(mockResult);
      expect(result.kind).toBe('remote');
      expect(result.upstream).toBeNull();
      expect(result.canDeleteTracking).toBe(false);
    });
  });

  describe('restoreBranch', () => {
    it('restoreBranch 请求体应携带 directory/branch/tip/upstream', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify({ success: true }),
      });

      const upstream = { remote: 'origin', branch: 'dev' };
      const result = await service.restoreBranch('/path/to/repo', 'dev', '1234567890abcdef1234567890abcdef12345678', upstream);

      expect(result).toEqual({ success: true });
      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-restore-branch',
        body: JSON.stringify({
          directory: '/path/to/repo',
          branch: 'dev',
          tip: '1234567890abcdef1234567890abcdef12345678',
          upstream,
        }),
      });
    });

    it('不传 upstream 时请求体不应包含 upstream 键', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify({ success: true }),
      });

      await service.restoreBranch('/path/to/repo', 'dev', '1234567890abcdef1234567890abcdef12345678');

      const bodyText = mockHost.serviceRequest.mock.calls[0][0].body as string;
      expect(JSON.parse(bodyText)).toEqual({
        directory: '/path/to/repo',
        branch: 'dev',
        tip: '1234567890abcdef1234567890abcdef12345678',
      });
      expect(bodyText).not.toContain('"upstream"');
    });

    it('upstream 传 null 时请求体也不应包含 upstream 键', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify({ success: true }),
      });

      await service.restoreBranch('/path/to/repo', 'dev', '1234567890abcdef1234567890abcdef12345678', null);

      const bodyText = mockHost.serviceRequest.mock.calls[0][0].body as string;
      expect(bodyText).not.toContain('"upstream"');
    });
  });

  describe('deleteRemoteBranch', () => {
    it('deleteRemoteBranch 请求体应携带 directory/remote/branch', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify({ success: true }),
      });

      const result = await service.deleteRemoteBranch('/path/to/repo', 'origin', 'dev');

      expect(result).toEqual({ success: true });
      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-delete-remote-branch',
        body: JSON.stringify({ directory: '/path/to/repo', remote: 'origin', branch: 'dev' }),
      });
      // 请求体解析后三个键均应在位
      const bodyText = mockHost.serviceRequest.mock.calls[0][0].body as string;
      const parsed = JSON.parse(bodyText);
      expect(parsed.directory).toBe('/path/to/repo');
      expect(parsed.remote).toBe('origin');
      expect(parsed.branch).toBe('dev');
    });
  });

  describe('createNewBranch', () => {
    it('应该创建新分支', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.createNewBranch('/path/to/repo', 'feature/new');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-create-branch',
        body: JSON.stringify({ directory: '/path/to/repo', name: 'feature/new' }),
      });
    });

    it('带起点提交时应把 startPoint 放入请求体', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.createNewBranch('/path/to/repo', 'feature/new', 'a004346789abcdef');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-create-branch',
        body: JSON.stringify({ directory: '/path/to/repo', name: 'feature/new', startPoint: 'a004346789abcdef' }),
      });
    });
  });

  describe('renameBranch', () => {
    it('应该重命名分支', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.renameBranch('/path/to/repo', 'old-name', 'new-name');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-rename-branch',
        body: JSON.stringify({ directory: '/path/to/repo', oldName: 'old-name', newName: 'new-name' }),
      });
    });
  });

  describe('pull', () => {
    it('应该拉取远程分支', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.pull('/path/to/repo');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-pull',
        body: JSON.stringify({ directory: '/path/to/repo' }),
      });
    });
  });

  describe('push', () => {
    it('应该推送到远程', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.push('/path/to/repo');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-push',
        body: JSON.stringify({ directory: '/path/to/repo' }),
      });
    });
  });

  describe('getLog', () => {
    it('应该获取提交日志', async () => {
      const mockLog = [
        { hash: 'abc123', message: 'test commit', authorName: 'Test', authorEmail: 'test@test.com', date: '2024-01-01' },
      ];

      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(mockLog),
      });

      const log = await service.getLog('/path/to/repo', 'main');

      expect(log).toEqual(mockLog);
      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-log',
        body: JSON.stringify({ directory: '/path/to/repo', branch: 'main' }),
      });
    });

    it('应该在请求体中携带 path 路径过滤参数', async () => {
      const mockLog = [
        { hash: 'abc123', message: 'src 提交', authorName: 'Test', authorEmail: 'test@test.com', date: '2024-01-01' },
      ];

      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(mockLog),
      });

      const log = await service.getLog('/path/to/repo', 'main', ['src']);

      expect(log).toEqual(mockLog);
      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-log',
        body: JSON.stringify({ directory: '/path/to/repo', branch: 'main', path: ['src'] }),
      });
    });

    it('getLog 应在请求体中携带路径数组', async () => {
      const mockLog = [
        { hash: 'abc123', message: 'docs 提交', authorName: 'Test', authorEmail: 'test@test.com', date: '2024-01-01' },
      ];

      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(mockLog),
      });

      const log = await service.getLog('/path/to/repo', 'main', ['src', 'docs']);

      expect(log).toEqual(mockLog);
      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-log',
        body: JSON.stringify({ directory: '/path/to/repo', branch: 'main', path: ['src', 'docs'] }),
      });
      // 请求体中的 path 应为数组而非字符串
      const bodyText = mockHost.serviceRequest.mock.calls[0][0].body as string;
      expect(JSON.parse(bodyText).path).toEqual(['src', 'docs']);
      expect(Array.isArray(JSON.parse(bodyText).path)).toBe(true);
    });

    it('不传 path 时请求体不应包含 path 字段', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify([]),
      });

      await service.getLog('/path/to/repo');

      // JSON.stringify 会丢弃值为 undefined 的 path 键，body 中不出现 path
      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-log',
        body: JSON.stringify({ directory: '/path/to/repo' }),
      });
      const bodyText = mockHost.serviceRequest.mock.calls[0][0].body as string;
      expect(bodyText).not.toContain('"path"');
    });
  });

  describe('listFiles', () => {
    it('listFiles 应请求 /git-files 并返回文件列表', async () => {
      const mockFiles = ['README.md', 'src/app.ts', 'docs/guide.md'];

      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(mockFiles),
      });

      const files = await service.listFiles('/path/to/repo');

      expect(files).toEqual(mockFiles);
      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-files',
        body: JSON.stringify({ directory: '/path/to/repo' }),
      });
    });
  });

  describe('getFavorites', () => {
    it('应该获取收藏列表', async () => {
      const mockFavorites = ['main', 'feature/test'];

      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(mockFavorites),
      });

      const favorites = await service.getFavorites('/path/to/repo');

      expect(favorites).toEqual(mockFavorites);
      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-favorites-get',
        body: JSON.stringify({ directory: '/path/to/repo' }),
      });
    });
  });

  describe('saveFavorites', () => {
    it('应该保存收藏列表', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.saveFavorites('/path/to/repo', ['main', 'feature/test']);

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-favorites-set',
        body: JSON.stringify({ directory: '/path/to/repo', favorites: ['main', 'feature/test'] }),
      });
    });
  });

  describe('isGitRepository', () => {
    it('应该检查是否是 Git 仓库', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      const isGit = await service.isGitRepository('/path/to/repo');

      expect(isGit).toBe(true);
      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-is-repo',
        body: JSON.stringify({ directory: '/path/to/repo' }),
      });
    });
  });

  // ── 变异测试补充用例：覆盖尚未测试的 API 封装函数 ──

  describe('checkoutNewBranch', () => {
    it('应该创建并切换到新分支', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.checkoutNewBranch('/path/to/repo', 'feature/new');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-checkout-new',
        body: JSON.stringify({ directory: '/path/to/repo', name: 'feature/new' }),
      });
    });
  });

  describe('rebaseBranch', () => {
    it('应该变基到指定分支', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.rebaseBranch('/path/to/repo', 'main');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-rebase',
        body: JSON.stringify({ directory: '/path/to/repo', branch: 'main' }),
      });
    });
  });

  describe('rebaseAbort', () => {
    it('应该中止变基', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.rebaseAbort('/path/to/repo');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-rebase-abort',
        body: JSON.stringify({ directory: '/path/to/repo' }),
      });
    });
  });

  describe('rebaseContinue', () => {
    it('应该继续变基', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.rebaseContinue('/path/to/repo');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-rebase-continue',
        body: JSON.stringify({ directory: '/path/to/repo' }),
      });
    });
  });

  describe('cherryPick', () => {
    it('应该 cherry-pick 指定提交', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.cherryPick('/path/to/repo', 'abc123');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-cherry-pick',
        body: JSON.stringify({ directory: '/path/to/repo', hash: 'abc123' }),
      });
    });
  });

  describe('stash', () => {
    it('应该暂存更改', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.stash('/path/to/repo');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-stash-now',
        body: JSON.stringify({ directory: '/path/to/repo' }),
      });
    });
  });

  describe('fetch', () => {
    it('应该拉取远程更新', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.fetch('/path/to/repo');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-fetch',
        body: JSON.stringify({ directory: '/path/to/repo' }),
      });
    });
  });

  describe('forcePush', () => {
    it('应该强制推送到远程', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.forcePush('/path/to/repo');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-force-push',
        body: JSON.stringify({ directory: '/path/to/repo' }),
      });
    });
  });

  describe('getCommitDetail', () => {
    it('应该获取提交详情', async () => {
      const mockDetail = { hash: 'abc123', message: 'test commit' };
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(mockDetail),
      });

      const detail = await service.getCommitDetail('/path/to/repo', 'abc123');

      expect(detail).toEqual(mockDetail);
      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-commit-detail',
        body: JSON.stringify({ directory: '/path/to/repo', hash: 'abc123' }),
      });
    });
  });

  describe('getCommitDiffs', () => {
    it('应该获取提交差异', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify([]),
      });

      await service.getCommitDiffs('/path/to/repo', 'abc123');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-commit-diffs',
        body: JSON.stringify({ directory: '/path/to/repo', hash: 'abc123' }),
      });
    });
  });

  describe('diffVsLocal', () => {
    it('应发送与本地（工作区）比较差异请求', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify([]),
      });

      await service.diffVsLocal('/path/to/repo', 'abc123');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-diff-vs-local',
        body: JSON.stringify({ directory: '/path/to/repo', hash: 'abc123' }),
      });
    });
  });

  describe('getBranchDiff', () => {
    it('应该获取分支比较差异', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify([]),
      });

      await service.getBranchDiff('/path/to/repo', 'main', 'feature/test');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-branch-diff',
        body: JSON.stringify({ directory: '/path/to/repo', from: 'main', to: 'feature/test' }),
      });
    });
  });

  describe('reset', () => {
    it('应该重置分支到指定提交', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.reset('/path/to/repo', 'abc123', 'hard');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-reset',
        body: JSON.stringify({ directory: '/path/to/repo', hash: 'abc123', mode: 'hard' }),
      });
    });
  });

  describe('revert', () => {
    it('应该回滚提交', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.revert('/path/to/repo', 'abc123');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-revert',
        body: JSON.stringify({ directory: '/path/to/repo', hash: 'abc123' }),
      });
    });
  });

  describe('undoCommit', () => {
    it('应该撤销提交', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(true),
      });

      await service.undoCommit('/path/to/repo', 'abc123');

      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-undo-commit',
        body: JSON.stringify({ directory: '/path/to/repo', hash: 'abc123' }),
      });
    });
  });

  describe('getStatus', () => {
    it('应该获取 Git 状态', async () => {
      const mockStatus = { branch: 'main', dirty: true };
      mockHost.serviceRequest.mockResolvedValue({
        status: 200,
        body: JSON.stringify(mockStatus),
      });

      const status = await service.getStatus('/path/to/repo');

      expect(status).toEqual(mockStatus);
      expect(mockHost.serviceRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/git-status',
        body: JSON.stringify({ directory: '/path/to/repo' }),
      });
    });
  });

  // ── 变异测试补充用例：非 200 分支与错误日志 ──

  describe('serviceCall 非 200 分支', () => {
    it('响应体为合法 JSON 时也应按状态码抛出错误', async () => {
      mockHost.serviceRequest.mockResolvedValue({
        status: 500,
        body: JSON.stringify({ error: '业务失败' }),
      });

      await expect(service.serviceCall('test-endpoint', {})).rejects.toThrow('业务失败');
    });
  });

  describe('safeServiceCall 错误日志', () => {
    it('调用失败时应输出带固定前缀的日志', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        mockHost.serviceRequest.mockRejectedValue(new Error('网络中断'));

        const result = await service.safeServiceCall('git-push', { directory: '/path/to/repo' });

        expect(result.success).toBe(false);
        expect(result.error).toBe('网络中断');
        expect(consoleSpy).toHaveBeenCalledWith(
          '[git-manager] git-push 调用失败:',
          '网络中断'
        );
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });
});
