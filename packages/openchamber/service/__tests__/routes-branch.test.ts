/**
 * service 路由测试：分支操作类
 * 验证创建/切换/重命名/删除分支的副作用与参数生效
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

/** 测试仓库目录 */
let repoDir: string;
const TOKEN = 'test-token';

/**
 * 在测试仓库执行 git 命令
 * @param args git 参数
 * @returns stdout
 */
async function git(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd: repoDir });
  return stdout.trim();
}

/**
 * 调用 service 路由
 * @param path 路由路径
 * @param body 请求体
 * @returns 状态码与响应数据
 */
async function call(path: string, body: Record<string, unknown> = {}): Promise<{
  status: number;
  data: unknown;
}> {
  const { handleRequest } = await import('../main');
  const res = await handleRequest(
    new Request(`http://localhost/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  const text = await res.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    // 非 JSON 保留原文
  }
  return { status: res.status, data };
}

describe('service 路由：分支操作', () => {
  beforeEach(async () => {
    repoDir = mkdtempSync(join(tmpdir(), 'git-manage-svc-b-'));
    process.env.OPENCHAMBER_SERVICE_TOKEN = TOKEN;
    vi.resetModules();

    await git(['init', '-b', 'main']);
    await git(['config', 'user.email', 'test@example.com']);
    await git(['config', 'user.name', '测试用户']);
    await git(['config', 'commit.gpgsign', 'false']);
    writeFileSync(join(repoDir, 'a.txt'), 'a\n');
    await git(['add', '.']);
    await git(['commit', '-m', '初始提交']);
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  describe('/git-create-branch', () => {
    it('应创建新分支且不切换', async () => {
      const res = await call('git-create-branch', { directory: repoDir, name: 'feature/new' });
      expect(res.status).toBe(200);

      const branches = (await git(['branch', '--format=%(refname:short)'])).split('\n');
      expect(branches).toContain('feature/new');
      // 仍在 main
      expect(await git(['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('main');
    });

    it('基于指定提交创建分支', async () => {
      const head = await git(['rev-parse', 'HEAD']);
      writeFileSync(join(repoDir, 'b.txt'), 'b\n');
      await git(['add', '.']);
      await git(['commit', '-m', '第二个提交']);

      const res = await call('git-create-branch', {
        directory: repoDir,
        name: 'from-first',
        startPoint: head,
      });
      expect(res.status).toBe(200);
      // 新分支应指向第一个提交
      expect(await git(['rev-parse', 'from-first'])).toBe(head);
    });
  });

  describe('/git-checkout', () => {
    it('应切换到目标分支', async () => {
      await git(['branch', 'target']);
      const res = await call('git-checkout', { directory: repoDir, branch: 'target' });
      expect(res.status).toBe(200);
      expect(await git(['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('target');
    });
  });

  describe('/git-rename-branch', () => {
    it('应重命名分支', async () => {
      await git(['branch', 'old-name']);
      const res = await call('git-rename-branch', {
        directory: repoDir,
        oldName: 'old-name',
        newName: 'new-name',
      });
      expect(res.status).toBe(200);

      const branches = (await git(['branch', '--format=%(refname:short)'])).split('\n');
      expect(branches).toContain('new-name');
      expect(branches).not.toContain('old-name');
    });
  });

  describe('/git-delete-branch', () => {
    it('应删除已合并的分支', async () => {
      await git(['branch', 'to-delete']);
      const res = await call('git-delete-branch', { directory: repoDir, branch: 'to-delete' });
      expect(res.status).toBe(200);

      const branches = (await git(['branch', '--format=%(refname:short)'])).split('\n');
      expect(branches).not.toContain('to-delete');
    });

    it('未合并分支应返回 NOT_MERGED 并保留分支', async () => {
      await git(['checkout', '-b', 'unmerged']);
      writeFileSync(join(repoDir, 'c.txt'), 'c\n');
      await git(['add', '.']);
      await git(['commit', '-m', '未合并提交']);
      await git(['checkout', 'main']);

      const res = await call('git-delete-branch', { directory: repoDir, branch: 'unmerged' });
      expect(res.status).not.toBe(200);
      const body = res.data as { code?: string; message?: string };
      expect(body.code).toBe('NOT_MERGED');

      const branches = (await git(['branch', '--format=%(refname:short)'])).split('\n');
      expect(branches).toContain('unmerged');
    });

    it('force=true 时应强制删除未合并分支', async () => {
      await git(['checkout', '-b', 'unmerged2']);
      writeFileSync(join(repoDir, 'd.txt'), 'd\n');
      await git(['add', '.']);
      await git(['commit', '-m', '未合并提交2']);
      await git(['checkout', 'main']);

      const res = await call('git-delete-branch', {
        directory: repoDir,
        branch: 'unmerged2',
        force: true,
      });
      expect(res.status).toBe(200);

      const branches = (await git(['branch', '--format=%(refname:short)'])).split('\n');
      expect(branches).not.toContain('unmerged2');
    });

    it('删除应返回还原所需数据（kind/tip）', async () => {
      await git(['branch', 'restorable']);
      const res = await call('git-delete-branch', { directory: repoDir, branch: 'restorable' });
      expect(res.status).toBe(200);
      expect(res.data).toMatchObject({ kind: 'local' });
      expect((res.data as { tip: string }).tip.length).toBe(40);
    });
  });

  describe('/git-restore-branch', () => {
    it('应把已删除的分支还原到原位置', async () => {
      const tip = await git(['rev-parse', 'HEAD']);
      await git(['branch', 'temp']);
      await call('git-delete-branch', { directory: repoDir, branch: 'temp' });

      const res = await call('git-restore-branch', {
        directory: repoDir,
        branch: 'temp',
        tip,
      });
      expect(res.status).toBe(200);

      const branches = (await git(['branch', '--format=%(refname:short)'])).split('\n');
      expect(branches).toContain('temp');
      expect(await git(['rev-parse', 'temp'])).toBe(tip);
    });
  });
});
