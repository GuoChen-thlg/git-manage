/**
 * git 命令执行安全测试
 * 验证 gitExec / gitExecStrict 拒绝 --upload-pack / --receive-pack / --exec
 * 等可让 git 执行外部程序的危险选项（防二阶命令注入），
 * 且正常命令不受影响、被拒绝的命令不记入命令日志
 */
import { describe, it, expect } from 'vitest';
import {
  gitExec,
  gitExecStrict,
  getGitCommandLogs,
  clearGitCommandLogs,
  GitError,
} from '../index.js';

/**
 * 校验发生在命令真正执行之前，cwd 不需要是真实 git 仓库，
 * 这里统一用进程根目录，命中危险选项时命令不会被真正执行
 */
const cwd = process.cwd();

describe('git 危险选项校验（防二阶命令注入）', () => {
  it('数组形式含 --upload-pack=xxx 应抛 GitError', async () => {
    await expect(
      gitExec(['clone', '--upload-pack=evil', 'url'], { cwd })
    ).rejects.toBeInstanceOf(GitError);
  });

  it('字符串形式含 --upload-pack=xxx 应拒绝执行', async () => {
    await expect(
      gitExec('fetch --upload-pack=evil url', { cwd })
    ).rejects.toBeInstanceOf(GitError);
  });

  it('数组形式含 --receive-pack=xxx 应拒绝执行', async () => {
    await expect(
      gitExec(['push', '--receive-pack=/bin/sh'], { cwd })
    ).rejects.toBeInstanceOf(GitError);
  });

  it('分离值形式 --receive-pack evil（选项本身单独出现）应拒绝执行', async () => {
    await expect(
      gitExec(['push', '--receive-pack', 'evil'], { cwd })
    ).rejects.toBeInstanceOf(GitError);
  });

  it('gitExecStrict 含 --exec 应抛 GitError', async () => {
    await expect(
      gitExecStrict(['rebase', '--exec=touch pwned'], { cwd })
    ).rejects.toBeInstanceOf(GitError);
  });

  it('正常命令不受校验影响（项目根本身是 git 仓库，rev-parse 可正常返回）', async () => {
    clearGitCommandLogs();

    const result = await gitExec('rev-parse --is-inside-work-tree', { cwd });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('true');

    // 正常命令应照常记入命令日志
    expect(getGitCommandLogs().some(l => l.command === 'git rev-parse --is-inside-work-tree')).toBe(true);
    clearGitCommandLogs();
  });

  it('被危险选项拒绝的命令不应记入命令日志', async () => {
    clearGitCommandLogs();

    await expect(
      gitExec(['clone', '--upload-pack=evil', 'url'], { cwd })
    ).rejects.toBeInstanceOf(GitError);

    // 校验在执行前抛出，不进入命令日志记录流程
    // （命令日志是进程级全局状态，并行的其他用例可能写入，这里只断言不含本命令）
    expect(getGitCommandLogs().some(l => l.command.includes('upload-pack'))).toBe(false);
  });
});
