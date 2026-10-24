/**
 * git 命令日志测试
 * 验证 gitExec 成功/失败都会记录日志、增量读取、环形缓冲上限与清空
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  gitExec,
  gitExecStrict,
  getGitCommandLogs,
  clearGitCommandLogs,
  GitError,
} from '../index.js';

const execFileAsync = promisify(execFile);

/** 测试仓库目录 */
let repoDir: string;

/**
 * 直接执行 git（搭建 fixture 用）
 * @param args - git 参数
 * @returns stdout
 */
async function git(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd: repoDir });
  return stdout.trim();
}

describe('git 命令日志', () => {
  beforeEach(async () => {
    clearGitCommandLogs();
    repoDir = mkdtempSync(join(tmpdir(), 'git-manage-log-'));
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
    clearGitCommandLogs();
  });

  it('成功命令应记录命令、目录、退出码与输出', async () => {
    await gitExec('status --porcelain', { cwd: repoDir });

    const logs = getGitCommandLogs();
    expect(logs.length).toBe(1);
    const entry = logs[0]!;
    expect(entry.ok).toBe(true);
    expect(entry.exitCode).toBe(0);
    expect(entry.command).toBe('git status --porcelain');
    expect(entry.cwd).toBe(repoDir);
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
    expect(entry.startedAt).toBeGreaterThan(0);
  });

  it('非零退出码的命令也应记录（新建分支重名被据的场景）', async () => {
    // 分支已存在时 checkout -b 返回非零，模拟用户重复建分支的真实失败
    await git(['branch', 'dr']);

    const result = await gitExec(['checkout', '-b', 'dr'], { cwd: repoDir });
    expect(result.exitCode).not.toBe(0);

    const entry = getGitCommandLogs().at(-1)!;
    expect(entry.ok).toBe(false);
    expect(entry.exitCode).toBe(result.exitCode);
    expect(entry.command).toBe('git checkout -b dr');
    // git 报错文案随系统语言变化，只断言有错误输出
    expect(entry.stderr.length).toBeGreaterThan(0);
  });

  it('gitExecStrict 失败抛错时同样留下日志', async () => {
    await expect(gitExecStrict('log --not-a-real-flag', { cwd: repoDir })).rejects.toBeInstanceOf(GitError);

    const entry = getGitCommandLogs().at(-1)!;
    expect(entry.ok).toBe(false);
    expect(entry.command).toBe('git log --not-a-real-flag');
  });

  it('incremental 读取应只返回 id 大于 since 的记录', async () => {
    await gitExec('rev-parse --abbrev-ref HEAD', { cwd: repoDir });
    const firstId = getGitCommandLogs().at(-1)!.id;

    await gitExec('status --porcelain', { cwd: repoDir });
    await gitExec('log --oneline -1', { cwd: repoDir });

    const incremental = getGitCommandLogs(firstId);
    expect(incremental.map(l => l.command)).toEqual(['git status --porcelain', 'git log --oneline -1']);

    // since 为最新 id 时应无记录
    expect(getGitCommandLogs(incremental.at(-1)!.id)).toEqual([]);
  });

  it('环形缓冲应丢弃最旧记录，最多保留 200 条', async () => {
    // 日志缓冲是进程级全局状态，并行执行的其他用例也会写入，
    // 因此这里只断言「超过上限后仍不超过 200 条」且序号连续。
    // 200 条上限 + 10 条余量刚好覆盖裁剪分支
    for (let i = 0; i < 210; i += 1) {
      await gitExec('rev-parse HEAD', { cwd: repoDir });
    }

    const logs = getGitCommandLogs(0, 1000);
    expect(logs.length).toBeLessThanOrEqual(200);
    expect(logs.length).toBeGreaterThan(0);
    // 序号严格递增且无空洞（裁剪后仍连续）
    for (let i = 1; i < logs.length; i += 1) {
      expect(logs[i]!.id).toBe(logs[i - 1]!.id + 1);
    }
    // 需串行拉起 210 个 git 进程，并行负载下会超过默认 5s
  }, 20000);

  it('clearGitCommandLogs 应清空缓冲', async () => {
    await gitExec('status --porcelain', { cwd: repoDir });
    expect(getGitCommandLogs().length).toBeGreaterThan(0);

    clearGitCommandLogs();
    // 只断言此前记录已消失：并行执行的其他用例可能正在写入
    expect(getGitCommandLogs().every(l => l.command !== 'git status --porcelain')).toBe(true);
  });
});
