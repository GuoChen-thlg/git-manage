/**
 * service 路由测试：查询类
 * 验证只读接口返回的数据形状与参数生效情况
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

describe('service 路由：查询类', () => {
  beforeEach(async () => {
    repoDir = mkdtempSync(join(tmpdir(), 'git-manage-svc-q-'));
    process.env.OPENCHAMBER_SERVICE_TOKEN = TOKEN;
    vi.resetModules();

    await git(['init', '-b', 'main']);
    await git(['config', 'user.email', 'test@example.com']);
    await git(['config', 'user.name', '测试用户']);
    await git(['config', 'commit.gpgsign', 'false']);
    writeFileSync(join(repoDir, 'a.txt'), 'a\n');
    await git(['add', '.']);
    await git(['commit', '-m', '初始提交']);
    await git(['checkout', '-b', 'feat']);
    writeFileSync(join(repoDir, 'b.txt'), 'b\n');
    await git(['add', '.']);
    await git(['commit', '-m', 'feat 提交']);
    await git(['checkout', 'main']);
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  describe('/git-log', () => {
    it('不传 branch 时应返回当前分支的提交', async () => {
      const res = await call('git-log', { directory: repoDir, limit: 10 });
      const commits = res.data as Array<{ message: string }>;
      expect(commits.map(c => c.message)).toEqual(['初始提交']);
    });

    it('传入 branch 时应返回该分支提交', async () => {
      const res = await call('git-log', { directory: repoDir, limit: 10, branch: 'feat' });
      const commits = res.data as Array<{ message: string }>;
      expect(commits.map(c => c.message)).toContain('feat 提交');
    });

    it('limit 应生效', async () => {
      const res = await call('git-log', { directory: repoDir, limit: 1, branch: 'feat' });
      expect((res.data as unknown[]).length).toBe(1);
    });
  });

  describe('/git-branches', () => {
    it('应返回本地与远程分支，当前分支标记正确', async () => {
      const res = await call('git-branches', { directory: repoDir });
      const branches = res.data as Array<{ name: string; isCurrent: boolean }>;
      expect(branches.find(b => b.name === 'main')?.isCurrent).toBe(true);
      expect(branches.find(b => b.name === 'feat')?.isCurrent).toBe(false);
    });

    it('commit 字段应为 7 位短哈希', async () => {
      const res = await call('git-branches', { directory: repoDir });
      const branches = res.data as Array<{ name: string; commit?: string }>;
      const withCommit = branches.filter(b => b.commit);
      expect(withCommit.length).toBeGreaterThan(0);
      for (const b of withCommit) {
        expect(b.commit!.length, `${b.name} 的 commit 应为短哈希`).toBe(7);
      }
    });
  });

  describe('/git-my-branches', () => {
    it('应返回当前作者创作的分支，不含 origin 符号引用', async () => {
      const res = await call('git-my-branches', { directory: repoDir });
      const mine = res.data as string[];
      expect(mine).toContain('feat');
      expect(mine).not.toContain('origin');
    });
  });

  describe('/git-commit-detail', () => {
    it('应返回提交详情且含创作时间与提交时间', async () => {
      const head = await git(['rev-parse', 'HEAD']);
      const res = await call('git-commit-detail', { directory: repoDir, hash: head });
      const detail = res.data as { message: string; date: string; commitDate?: string };
      expect(detail.message).toBe('初始提交');
      expect(detail.date).toBeTruthy();
      expect(detail.commitDate).toBeTruthy();
    });
  });

  describe('/git-is-repo', () => {
    it('git 仓库应返回 true', async () => {
      const res = await call('git-is-repo', { directory: repoDir });
      expect(res.data).toBe(true);
    });

    it('非 git 目录应返回 false', async () => {
      const plain = mkdtempSync(join(tmpdir(), 'git-manage-plain-'));
      try {
        const res = await call('git-is-repo', { directory: plain });
        expect(res.data).toBe(false);
      } finally {
        rmSync(plain, { recursive: true, force: true });
      }
    });
  });

  describe('/git-status', () => {
    it('干净仓库应无变更', async () => {
      const res = await call('git-status', { directory: repoDir });
      expect((res.data as { hasChanges: boolean }).hasChanges).toBe(false);
    });

    it('修改文件后应报告变更', async () => {
      writeFileSync(join(repoDir, 'a.txt'), 'changed\n');
      const res = await call('git-status', { directory: repoDir });
      expect((res.data as { hasChanges: boolean }).hasChanges).toBe(true);
    });
  });

  describe('/git-files', () => {
    it('应返回已跟踪文件列表', async () => {
      const res = await call('git-files', { directory: repoDir });
      const files = res.data as string[];
      expect(files).toContain('a.txt');
    });
  });

  describe('鉴权与未知路由', () => {
    it('缺少 token 应返回 401', async () => {
      const { handleRequest } = await import('../main');
      const res = await handleRequest(
        new Request('http://localhost/git-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ directory: repoDir }),
        }),
      );
      expect(res.status).toBe(401);
    });

    it('未知路由应返回 404', async () => {
      const res = await call('git-not-exist', { directory: repoDir });
      expect(res.status).toBe(404);
    });
  });
});
