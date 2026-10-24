/**
 * service 路由测试：提交改写相关
 * 重点验证「参数是否真的生效」，而非仅返回 200。
 * 这类缺陷（如 undo-commit 忽略 hash、固定 reset HEAD~1）只有通过真实 git 仓库
 * 断言副作用才能被发现。
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
/** 测试 token（verifyToken 依赖环境变量） */
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
 * @param path 路由路径（不含前导 /）
 * @param body 请求体
 * @returns 解析后的响应
 */
async function call(path: string, body: Record<string, unknown> = {}): Promise<{
  status: number;
  data: unknown;
}> {
  // 动态导入：避免模块顶层的 Bun.serve 在测试环境执行
  const { handleRequest } = await import('../main');
  const res = await handleRequest(
    new Request(`http://localhost/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
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

/**
 * 创建测试仓库：3 个提交，位于 feat 分支
 */
async function createRepo(): Promise<void> {
  await git(['init', '-b', 'main']);
  await git(['config', 'user.email', 'test@example.com']);
  await git(['config', 'user.name', '测试用户']);
  await git(['config', 'commit.gpgsign', 'false']);

  for (const name of ['a', 'b', 'c']) {
    writeFileSync(join(repoDir, `${name}.txt`), `${name}\n`);
    await git(['add', '.']);
    await git(['commit', '-m', `提交 ${name}`]);
  }
}

describe('service 路由：提交改写', () => {
  beforeEach(async () => {
    repoDir = mkdtempSync(join(tmpdir(), 'git-manage-svc-'));
    process.env.OPENCHAMBER_SERVICE_TOKEN = TOKEN;
    vi.resetModules();
    await createRepo();
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  describe('/git-undo-commit', () => {
    it('应撤销传入 hash 的提交，而不是固定撤销 HEAD', async () => {
      const hashes = (await git(['log', '--format=%H'])).split('\n');
      const before = hashes.length;

      // 撤销 HEAD（c）
      const res = await call('git-undo-commit', { directory: repoDir, hash: hashes[0] });
      expect(res.status).toBe(200);

      const after = (await git(['log', '--format=%H'])).split('\n');
      expect(after.length).toBe(before - 1);
      expect(after[0]).toBe(hashes[1]);
    });

    it('改动应保留在暂存区（reset --soft 语义）', async () => {
      const hashes = (await git(['log', '--format=%H'])).split('\n');
      await call('git-undo-commit', { directory: repoDir, hash: hashes[0] });

      const staged = await git(['diff', '--cached', '--name-only']);
      expect(staged).toContain('c.txt');
    });

    it('传入非 HEAD 的 hash 时应返回 500 并说明原因', async () => {
      const hashes = (await git(['log', '--format=%H'])).split('\n');
      const res = await call('git-undo-commit', { directory: repoDir, hash: hashes[2] });

      expect(res.status).toBe(500);
      expect(String(res.data)).toContain('只能撤销当前分支的最新提交');
      // 提交历史不应被改动
      const after = (await git(['log', '--format=%H'])).split('\n');
      expect(after.length).toBe(hashes.length);
    });

    it('工作区有未提交改动时应拒绝执行', async () => {
      const hashes = (await git(['log', '--format=%H'])).split('\n');
      writeFileSync(join(repoDir, 'dirty.txt'), 'dirty\n');
      await git(['add', '.']);

      const res = await call('git-undo-commit', { directory: repoDir, hash: hashes[0] });
      expect(res.status).toBe(500);
      expect(String(res.data)).toContain('工作区有未提交的改动');
    });
  });

  describe('/git-reword-commit', () => {
    it('应更新指定 HEAD 提交的信息', async () => {
      const head = (await git(['rev-parse', 'HEAD'])).trim();
      const res = await call('git-reword-commit', {
        directory: repoDir,
        hash: head,
        message: '改写后的信息',
      });
      expect(res.status).toBe(200);
      expect(await git(['log', '-1', '--format=%s'])).toBe('改写后的信息');
    });

    it('非 HEAD 提交也应能改写（走 rebase）', async () => {
      const hashes = (await git(['log', '--format=%H'])).split('\n');
      const res = await call('git-reword-commit', {
        directory: repoDir,
        hash: hashes[1],
        message: '中间提交改信息',
      });
      expect(res.status).toBe(200);

      const subjects = (await git(['log', '--format=%s'])).split('\n');
      expect(subjects).toContain('中间提交改信息');
      expect(subjects[0]).toBe('提交 c');
    });
  });

  describe('/git-drop-commit', () => {
    it('应删除指定 HEAD 提交', async () => {
      const hashes = (await git(['log', '--format=%H'])).split('\n');
      const res = await call('git-drop-commit', { directory: repoDir, hash: hashes[0] });
      expect(res.status).toBe(200);

      const after = (await git(['log', '--format=%H'])).split('\n');
      expect(after).not.toContain(hashes[0]);
      expect(after.length).toBe(hashes.length - 1);
    });
  });

  describe('/git-working-tree-clean', () => {
    it('干净时应返回 true', async () => {
      const res = await call('git-working-tree-clean', { directory: repoDir });
      expect(res.status).toBe(200);
      expect(res.data).toBe(true);
    });

    it('有未提交改动时应返回 false', async () => {
      writeFileSync(join(repoDir, 'dirty.txt'), 'dirty\n');
      const res = await call('git-working-tree-clean', { directory: repoDir });
      expect(res.data).toBe(false);
    });
  });

  describe('/git-commit-edit-info', () => {
    it('HEAD 提交应返回 isHead=true', async () => {
      const head = (await git(['rev-parse', 'HEAD'])).trim();
      const res = await call('git-commit-edit-info', { directory: repoDir, hash: head });
      expect(res.data).toMatchObject({ isHead: true, isMerge: false });
    });

    it('非 HEAD 提交应返回 isHead=false', async () => {
      const hashes = (await git(['log', '--format=%H'])).split('\n');
      const res = await call('git-commit-edit-info', { directory: repoDir, hash: hashes[2] });
      expect(res.data).toMatchObject({ isHead: false });
    });
  });

  describe('/git-revert', () => {
    it('应生成一条反向提交且不改写历史', async () => {
      const head = (await git(['rev-parse', 'HEAD'])).trim();
      const before = (await git(['log', '--format=%H'])).split('\n').length;

      const res = await call('git-revert', { directory: repoDir, hash: head });
      expect(res.status).toBe(200);

      const after = (await git(['log', '--format=%H'])).split('\n');
      // revert 新增一条提交，原提交仍在
      expect(after.length).toBe(before + 1);
      expect(after).toContain(head);
    });
  });
});
