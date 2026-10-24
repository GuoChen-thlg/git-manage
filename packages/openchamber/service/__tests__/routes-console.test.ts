/**
 * service 路由测试：git 命令日志
 * 验证 /git-command-logs 的增量读取、目录过滤，以及 /git-command-logs-clear 清空
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

/** 命令日志条目（与 core GitCommandLog 对齐的最小结构） */
interface LogEntry {
  id: number;
  command: string;
  cwd: string;
  ok: boolean;
  exitCode: number;
}

describe('service 路由：git 命令日志', () => {
  beforeEach(async () => {
    repoDir = mkdtempSync(join(tmpdir(), 'git-manage-svc-log-'));
    process.env.OPENCHAMBER_SERVICE_TOKEN = TOKEN;
    vi.resetModules();

    await git(['init', '-b', 'main']);
    await git(['config', 'user.email', 'test@example.com']);
    await git(['config', 'user.name', '测试用户']);
    await git(['config', 'commit.gpgsign', 'false']);
    writeFileSync(join(repoDir, 'a.txt'), 'a\n');
    await git(['add', '.']);
    await git(['commit', '-m', '初始提交']);

    // 清掉前面夹具阶段可能残留的日志，保证断言从干净状态开始
    await call('git-command-logs-clear', {});
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it('应返回扩展执行过的 git 命令', async () => {
    // 通过 service 路由触发一次真实 git 调用
    await call('git-status', { directory: repoDir });

    const res = await call('git-command-logs', { directory: repoDir });
    expect(res.status).toBe(200);
    const logs = res.data as LogEntry[];
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.at(-1)!.command).toContain('git status');
    expect(logs.at(-1)!.cwd).toBe(repoDir);
  });

  it('传入 since 时应只返回更新的记录', async () => {
    await call('git-status', { directory: repoDir });
    const first = (await call('git-command-logs', { directory: repoDir })).data as LogEntry[];
    const lastId = first.at(-1)!.id;

    // 无新命令时应返回空数组
    const empty = await call('git-command-logs', { directory: repoDir, since: lastId });
    expect(empty.data).toEqual([]);

    // 有新命令时只返回增量
    await call('git-branches', { directory: repoDir });
    const delta = await call('git-command-logs', { directory: repoDir, since: lastId });
    const deltaLogs = delta.data as LogEntry[];
    expect(deltaLogs.length).toBeGreaterThan(0);
    expect(deltaLogs.every(l => l.id > lastId)).toBe(true);
  });

  it('传入 directory 时应过滤掉其他目录的命令', async () => {
    await call('git-status', { directory: repoDir });

    const other = await call('git-command-logs', { directory: '/some/other/repo' });
    expect(other.data).toEqual([]);
  });

  it('未授权的请求应返回 401', async () => {
    const { handleRequest } = await import('../main');
    const res = await handleRequest(
      new Request('http://localhost/git-command-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('清空后应返回空列表', async () => {
    await call('git-status', { directory: repoDir });
    expect(((await call('git-command-logs', { directory: repoDir })).data as LogEntry[]).length).toBeGreaterThan(0);

    const res = await call('git-command-logs-clear', {});
    expect(res.status).toBe(200);

    expect((await call('git-command-logs', { directory: repoDir })).data).toEqual([]);
  });
});
