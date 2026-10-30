import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { GitError, type GitCommandOptions, type GitResult } from './types.js';

const execFileAsync = promisify(execFile);

/** 单条 git 命令记录 */
export interface GitCommandLog {
  /** 自增序号 */
  id: number;
  /** 执行时刻（毫秒时间戳） */
  startedAt: number;
  /** 耗时（毫秒） */
  durationMs: number;
  /** 完整命令文本（含 git 前缀） */
  command: string;
  /** 工作目录 */
  cwd: string;
  /** 退出码；启动失败时为 -1 */
  exitCode: number;
  /** 是否成功 */
  ok: boolean;
  /** 标准输出（截断至上限） */
  stdout: string;
  /** 标准错误（截断至上限） */
  stderr: string;
}

/**
 * 禁用的 git 危险选项列表（不含等号值形式）
 * 这些选项可让 git 去执行指定的外部程序（clone/fetch/pull/ls-remote 的 --upload-pack、
 * push/rebase 的 --receive-pack、push/rebase 的 --exec），
 * 一旦外部输入未经校验流入命令参数，就会造成二阶命令注入（任意命令执行），因此一律拒绝
 */
const FORBIDDEN_GIT_OPTIONS = ['--upload-pack', '--receive-pack', '--exec'];

/** 命令日志保留上限（环形缓冲，超出丢弃最旧） */
const GIT_LOG_LIMIT = 200;
/** 单条日志中 stdout/stderr 的保留字节上限 */
const GIT_LOG_OUTPUT_LIMIT = 8192;

/** 命令日志缓冲 */
const commandLogs: GitCommandLog[] = [];
/** 自增序号 */
let logSeq = 0;

/**
 * 读取最近的 git 命令日志（旧→新）
 * @param since 只返回 id 大于该值的记录
 * @param limit 最多返回条数
 * @returns 日志数组
 */
export function getGitCommandLogs(since = 0, limit = GIT_LOG_LIMIT): GitCommandLog[] {
  return commandLogs.filter(l => l.id > since).slice(-limit);
}

/**
 * 清空命令日志
 */
export function clearGitCommandLogs(): void {
  commandLogs.length = 0;
}

/**
 * 截断过长输出，避免单条记录吃掉整个缓冲
 * @param text 原始输出
 * @returns 截断后的文本
 */
function truncateOutput(text: string): string {
  if (text.length <= GIT_LOG_OUTPUT_LIMIT) return text;
  return `${text.slice(0, GIT_LOG_OUTPUT_LIMIT)}\n…（已截断，共 ${text.length} 字符）`;
}

/**
 * 记录一条命令执行结果
 * @param entry 除 id 外的记录内容
 */
function recordCommand(entry: Omit<GitCommandLog, 'id'>): void {
  logSeq += 1;
  commandLogs.push({ id: logSeq, ...entry });
  if (commandLogs.length > GIT_LOG_LIMIT) {
    commandLogs.splice(0, commandLogs.length - GIT_LOG_LIMIT);
  }
}

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

  // 字符串命令按空白拆分为参数数组；数组命令复制新数组：
  // 既避免执行期间被调用方修改，也不让外部输入直接成为执行参数
  const args = typeof command === 'string' ? command.split(/\s+/).filter(Boolean) : [...command];
  const commandText = Array.isArray(command) ? command.join(' ') : command;

  // 危险选项校验（防二阶命令注入）：--upload-pack / --receive-pack / --exec 可让 git 执行
  // 外部程序，命中（选项本身或 --xxx=值 形式）即拒绝。放在 try 之外：
  // 校验失败不是命令执行失败，不进入执行流程，也不记入命令日志
  const forbidden = args.find(
    arg => FORBIDDEN_GIT_OPTIONS.some(opt => arg === opt || arg.startsWith(`${opt}=`))
  );
  if (forbidden) {
    const option = FORBIDDEN_GIT_OPTIONS.find(
      opt => forbidden === opt || forbidden.startsWith(`${opt}=`)
    );
    throw new GitError(
      `Git 选项 ${option ?? forbidden} 已被禁用：该选项会指定 git 执行外部程序，存在命令注入风险`,
      { stdout: '', stderr: '', exitCode: 1 }
    );
  }

  // 计时用于命令日志展示耗时
  const startedAt = Date.now();

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

    const stdout = result.stdout.trimEnd();
    const stderr = result.stderr.trim();

    // 无论成败都记录，便于用户在控制台排查命令与输出
    recordCommand({
      startedAt,
      durationMs: Date.now() - startedAt,
      command: `git ${commandText}`,
      cwd,
      exitCode: 0,
      ok: true,
      stdout: truncateOutput(stdout),
      stderr: truncateOutput(stderr),
    });

    return {
      // 只清理尾部空白：git status --porcelain 行首空格承载暂存状态语义，不能吃掉
      stdout,
      stderr,
      exitCode: 0,
    };
  } catch (error: unknown) {
    const execError = error as { 
      stdout?: string; 
      stderr?: string; 
      code?: number;
      killed?: boolean;
    };

    const failStdout = execError.stdout ?? '';
    const failStderr = execError.killed ? '命令执行超时' : (execError.stderr ?? '');
    const failCode = execError.killed ? -1 : (execError.code ?? 1);

    // 失败同样记录：新建分支被拒之类的错误必须能在控制台看到
    recordCommand({
      startedAt,
      durationMs: Date.now() - startedAt,
      command: `git ${commandText}`,
      cwd,
      exitCode: failCode,
      ok: false,
      stdout: truncateOutput(failStdout),
      stderr: truncateOutput(failStderr),
    });

    // 命令超时
    if (execError.killed) {
      throw new GitError(`Git 命令执行超时: ${commandText}`, {
        stdout: failStdout,
        stderr: '命令执行超时',
        exitCode: -1,
      });
    }

    // Git 命令返回非零退出码
    return {
      stdout: failStdout,
      stderr: failStderr,
      exitCode: failCode,
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
