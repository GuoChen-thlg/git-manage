import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { GitError, type GitCommandOptions, type GitResult } from './types.js';

const execFileAsync = promisify(execFile);

/**
 * 执行 Git 命令
 * @param command - Git 命令（不含 git 前缀）；字符串按空白拆分，
 *   含空格参数（如提交信息）应传参数数组
 * @param options - 命令选项
 * @returns 命令执行结果
 * @throws GitError 命令执行失败时抛出
 */
export async function gitExec(
  command: string | string[],
  options: GitCommandOptions
): Promise<GitResult> {
  const { cwd, timeout = 30000, env } = options;

  // 字符串命令按空白拆分为参数数组；数组命令保留原始参数边界
  const args = typeof command === 'string' ? command.split(/\s+/).filter(Boolean) : command;
  const commandText = Array.isArray(command) ? command.join(' ') : command;

  try {
    const result = await execFileAsync('git', args, {
      cwd,
      timeout,
      env: {
        ...process.env,
        ...env,
        // 禁用 Git 提示
        GIT_TERMINAL_PROMPT: '0',
        GIT_ASKPASS: 'echo',
      },
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    return {
      // 只清理尾部空白：git status --porcelain 行首空格承载暂存状态语义，不能吃掉
      stdout: result.stdout.trimEnd(),
      stderr: result.stderr.trim(),
      exitCode: 0,
    };
  } catch (error: unknown) {
    const execError = error as { 
      stdout?: string; 
      stderr?: string; 
      code?: number;
      killed?: boolean;
    };

    // 命令超时
    if (execError.killed) {
      throw new GitError(`Git 命令执行超时: ${commandText}`, {
        stdout: execError.stdout ?? '',
        stderr: '命令执行超时',
        exitCode: -1,
      });
    }

    // Git 命令返回非零退出码
    return {
      stdout: execError.stdout ?? '',
      stderr: execError.stderr ?? '',
      exitCode: execError.code ?? 1,
    };
  }
}

/**
 * 安全执行 Git 命令，失败时抛出异常
 * @param command - Git 命令
 * @param options - 命令选项
 * @returns 命令执行结果
 * @throws GitError 命令执行失败时抛出
 */
export async function gitExecStrict(
  command: string | string[],
  options: GitCommandOptions
): Promise<GitResult> {
  const result = await gitExec(command, options);

  if (result.exitCode !== 0) {
    const commandText = Array.isArray(command) ? command.join(' ') : command;
    throw new GitError(
      `Git 命令执行失败: ${commandText}\n${result.stderr}`,
      result
    );
  }

  return result;
}

/**
 * 检查目录是否为 Git 仓库
 * @param cwd - 目录路径
 * @returns 是否为 Git 仓库
 */
export async function isRepository(cwd: string): Promise<boolean> {
  try {
    const result = await gitExec('rev-parse --is-inside-work-tree', { cwd });
    return result.exitCode === 0 && result.stdout === 'true';
  } catch {
    return false;
  }
}

/**
 * 获取仓库根目录
 * @param cwd - 目录路径
 * @returns 仓库根目录路径
 */
export async function getRepositoryRoot(cwd: string): Promise<string> {
  const result = await gitExecStrict('rev-parse --show-toplevel', { cwd });
  return result.stdout;
}
