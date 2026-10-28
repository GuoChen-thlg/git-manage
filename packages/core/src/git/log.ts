import { gitExec } from './executor.js';
import { GitError } from './types.js';
import type { GitCommandOptions, Commit, CommitDetail, BlameLine, LogOptions } from './types.js';
import { getCommitDiff } from './diff.js';

/**
 * 解析提交信息
 * @param raw - 原始提交数据
 * @returns 提交对象
 */
function parseCommit(raw: string): Commit | null {
  const lines = raw.split('\n');
  if (lines.length < 4) return null;

  const hash = lines[0];
  const shortHash = hash.substring(0, 7);
  const message = lines[1];
  const authorName = lines[2];
  const authorEmail = lines[3].replace(/[<>]/g, '');
  const date = lines[4] || '';
  const commitDate = lines[5] || '';
  const parents = lines[6] ? lines[6].split(' ').filter(Boolean) : [];

  return {
    hash,
    shortHash,
    message,
    authorName,
    authorEmail,
    date,
    commitDate,
    parents,
  };
}

/**
 * 获取提交日志
 * @param options - 日志选项
 *   - path: 路径过滤，仅返回触碰该路径的提交（作为 `--` 之后的 pathspec 传给 git）。
 *     支持字符串（单路径）与字符串数组（多选路径）；数组形式为**并集**语义，
 *     即命中任一路径的提交都会返回（等价 `git log -- a b`）；过滤空串后无剩余
 *     或传入空数组时跳过路径过滤
 *   - branch: 分支过滤，作为 revision 排在 `--` 之前；若放在 `--` 之后，
 *     git 会把分支名当路径解释，导致 branch+path 组合结果错误
 * @param gitOptions - Git 命令选项
 * @returns 提交列表
 */
export async function getLog(
  options: LogOptions = {},
  gitOptions: GitCommandOptions
): Promise<Commit[]> {
  const format = '%H%n%s%n%an%n%ae%n%ai%n%cI%n%P';
  // 使用数组构建参数：gitExec 数组形式保留参数边界、不经 shell，
  // 含空格的路径不会被按空白拆碎
  const args: string[] = ['log', `--format=${format}`];

  if (options.maxCount) {
    args.push(`--max-count=${options.maxCount}`);
  }
  if (options.since) {
    args.push(`--since="${options.since}"`);
  }
  if (options.until) {
    args.push(`--until="${options.until}"`);
  }
  // 分支必须在 `--` 之前 push：`--` 之后的参数一律按路径处理
  if (options.branch) {
    args.push(options.branch);
  }
  // 路径过滤放在 `--` 之后，作为 pathspec：
  // - 字符串：单路径，行为保持不变（空串沿用既有 falsy 语义跳过）
  // - 数组：多个 pathspec 为并集语义（命中任一路径的提交均返回），
  //   过滤空串后无剩余（含空数组）则跳过，等价于不按路径过滤
  if (typeof options.path === 'string') {
    if (options.path) {
      args.push('--', options.path);
    }
  } else if (Array.isArray(options.path)) {
    const paths = options.path.filter((p) => p !== '');
    if (paths.length > 0) {
      args.push('--', ...paths);
    }
  }

  const result = await gitExec(args, gitOptions);

  // 非零退出码不能静默当作「没有提交」：分支名写错、历史为空等情况必须区分，
  // 否则界面会显示空白列表而用户无从判断原因
  if (result.exitCode !== 0) {
    throw new GitError(`Git 命令执行失败: ${args.join(' ')}\n${result.stderr}`, result);
  }

  if (!result.stdout) {
    return [];
  }

  const commits: Commit[] = [];
  const lines = result.stdout.split('\n');

  // 每 7 行为一条提交: hash, subject, author, email, authorDate, commitDate, parents
  // 注意: root 提交 %P 为空，尾部空行被 trimEnd 消耗后末块只有 5 行，
  // 故按步长推进循环，块完整性交由 parseCommit 校验（不足 4 行返回 null）
  const COMMIT_FIELDS = 7;
  for (let i = 0; i < lines.length; i += COMMIT_FIELDS) {
    const block = lines.slice(i, i + COMMIT_FIELDS).join('\n');
    const commit = parseCommit(block.trim());
    if (commit) {
      commits.push(commit);
    }
  }

  return commits;
}

/**
 * 获取文件的提交历史
 * @param path - 文件路径
 * @param maxCount - 最大返回数量
 * @param options - Git 命令选项
 * @returns 提交列表
 */
export async function getFileHistory(
  path: string,
  maxCount: number = 50,
  options: GitCommandOptions
): Promise<Commit[]> {
  return getLog({ path, maxCount }, options);
}

/**
 * 获取提交详情（包含差异）
 * @param hash - 提交哈希
 * @param options - Git 命令选项
 * @returns 提交详情
 */
export async function showCommit(
  hash: string,
  options: GitCommandOptions
): Promise<CommitDetail | null> {
  // 获取提交基本信息
  const format = '%H%n%s%n%an%n%ae%n%ai%n%cI%n%P';
  const result = await gitExec(`show --format=${format} --stat ${hash}`, options);

  if (!result.stdout) {
    return null;
  }

  const lines = result.stdout.split('\n');
  if (lines.length < 7) return null;

  const commit: Commit = {
    hash: lines[0],
    shortHash: lines[0].substring(0, 7),
    message: lines[1],
    authorName: lines[2],
    authorEmail: lines[3].replace(/[<>]/g, ''),
    date: lines[4],
    commitDate: lines[5] || undefined,
    parents: lines[6] ? lines[6].split(' ').filter(Boolean) : [],
  };

  // 获取提交差异
  const diffs = await getCommitDiff(commit.parents[0] || '', hash, options);

  return {
    ...commit,
    diffs,
  };
}

/**
 * 文件追溯（blame）
 * @param path - 文件路径
 * @param options - Git 命令选项
 * @returns Blame 行信息列表
 */
export async function getBlame(
  path: string,
  options: GitCommandOptions
): Promise<BlameLine[]> {
  const format = '%H|%an|%ae|%ai|%s|%OI|%CN';
  const result = await gitExec(`blame --porcelain --format=${format} ${path}`, options);

  if (!result.stdout) {
    return [];
  }

  const lines: BlameLine[] = [];
  const rawLines = result.stdout.split('\n');
  let currentLine = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    
    // 解析 blame 信息行
    if (line.includes('|')) {
      const parts = line.split('|');
      if (parts.length >= 7) {
        currentLine++;
        lines.push({
          hash: parts[0],
          authorName: parts[1],
          authorEmail: parts[2],
          date: parts[3],
          message: parts[4],
          originalLine: parseInt(parts[5], 10) || currentLine,
          currentLine,
          content: '', // 内容在后续行
        });
      }
    } else if (currentLine > 0 && lines.length > 0 && !line.startsWith('\t')) {
      // 这是代码内容行
      const lastLine = lines[lines.length - 1];
      if (!lastLine.content) {
        lastLine.content = line;
      }
    }
  }

  return lines;
}

/**
 * 获取两个提交之间的提交列表
 * @param from - 起始提交
 * @param to - 结束提交
 * @param options - Git 命令选项
 * @returns 提交列表
 */
export async function getCommitRange(
  from: string,
  to: string,
  options: GitCommandOptions
): Promise<Commit[]> {
  const format = '%H%n%s%n%an%n%ae%n%ai%n%cI%n%P';
  const result = await gitExec(`log --format=${format} ${from}..${to}`, options);

  if (!result.stdout) {
    return [];
  }

  const commits: Commit[] = [];
  const lines = result.stdout.split('\n');

  const COMMIT_FIELDS = 7;
  for (let i = 0; i + COMMIT_FIELDS - 1 < lines.length; i += COMMIT_FIELDS) {
    const block = lines.slice(i, i + COMMIT_FIELDS).join('\n');
    const commit = parseCommit(block.trim());
    if (commit) {
      commits.push(commit);
    }
  }

  return commits;
}

/**
 * 获取当前分支的图表日志
 * @param maxCount - 最大返回数量
 * @param options - Git 命令选项
 * @returns 图表日志字符串
 */
export async function getGraphLog(
  maxCount: number = 20,
  options: GitCommandOptions
): Promise<string> {
  const result = await gitExec(
    `log --graph --oneline --decorate -n ${maxCount}`,
    options
  );
  return result.stdout;
}
