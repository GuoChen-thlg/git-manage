/**
 * 提交改写操作
 * 提供编辑提交信息、删除提交与推送至指定提交的能力。
 * 非 HEAD 提交通过交互式 rebase 实现，需保证目标提交在当前分支线性历史中。
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gitExec, gitExecStrict } from './executor.js';
import type { GitCommandOptions } from './types.js';

/**
 * 检查工作区与暂存区是否干净
 * 改写历史（rebase / reset）前必须无未提交改动，否则 git 会拒绝执行
 * @param options Git 命令选项
 * @returns 干净返回 true
 */
export async function isWorkingTreeClean(options: GitCommandOptions): Promise<boolean> {
  const result = await gitExec('status --porcelain=v1', options);
  return result.stdout.trim() === '';
}

/**
 * 断言工作区干净，否则抛出带提示的错误
 * @param options Git 命令选项
 */
async function assertWorkingTreeClean(options: GitCommandOptions): Promise<void> {
  if (await isWorkingTreeClean(options)) return;
  throw new Error('工作区有未提交的改动，请先提交或暂存后再编辑/删除提交');
}

/**
 * 判断目标提交是否为当前 HEAD
 * @param hash 提交哈希
 * @param options Git 命令选项
 * @returns 是 HEAD 返回 true
 */
export async function isHeadCommit(hash: string, options: GitCommandOptions): Promise<boolean> {
  const result = await gitExec('rev-parse HEAD', options);
  return result.stdout.trim() === hash;
}

/**
 * 判断提交是否为合并提交（父提交多于一个）
 * @param hash 提交哈希
 * @param options Git 命令选项
 * @returns 合并提交返回 true
 */
export async function isMergeCommit(hash: string, options: GitCommandOptions): Promise<boolean> {
  const result = await gitExec(['rev-list', '--parents', '-n', '1', hash], options);
  // 输出形如 "<hash> <parent1> <parent2>"，字段数 > 2 即为合并提交
  return result.stdout.trim().split(/\s+/).length > 2;
}

/**
 * 在临时目录执行一段处理，结束后清理
 * @param fn 接收临时目录路径的回调
 * @returns 回调返回值
 */
async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'git-manage-rebase-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * 撤销提交（保留改动到暂存区）
 * 对齐 IDEA Uncommit：仅允许撤销当前分支的 HEAD 提交，
 * 且工作区必须干净，避免把用户未提交的改动一起带走。
 * @param hash 目标提交哈希
 * @param options Git 命令选项
 * @throws 目标不是 HEAD 或工作区不干净时抛出带说明的错误
 */
export async function uncommitHead(hash: string, options: GitCommandOptions): Promise<void> {
  await assertWorkingTreeClean(options);

  if (!await isHeadCommit(hash, options)) {
    throw new Error('只能撤销当前分支的最新提交；请先切换到包含该提交的分支');
  }
  if (await isMergeCommit(hash, options)) {
    throw new Error('无法撤销合并提交，请使用 Reset 指定父提交');
  }

  // 用目标 hash 明确指定，避免并发或 HEAD 变动导致撤销错误的提交
  await gitExecStrict(['reset', '--soft', `${hash}^`], options);
}

/**
 * 修改提交信息
 * HEAD 提交使用 commit --amend；非 HEAD 提交走交互式 rebase 的 reword。
 * @param hash 目标提交哈希
 * @param message 新提交信息
 * @param options Git 命令选项
 */
export async function rewordCommit(
  hash: string,
  message: string,
  options: GitCommandOptions
): Promise<void> {
  await assertWorkingTreeClean(options);
  if (await isHeadCommit(hash, options)) {
    await gitExecStrict(['commit', '--amend', '-m', message], options);
    return;
  }

  await withTempDir(async (dir) => {
    const short = hash.slice(0, 7);
    // 序列编辑器：把目标提交的 pick 行改为 reword
    // 用 node 脚本而非 sed：BSD sed 不支持 `0,/re/` 地址形式，macOS 上会静默失败
    const sequenceScript = join(dir, 'sequence-editor.mjs');
    await writeFile(
      sequenceScript,
      `#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
const file = process.argv[2];
const short = ${JSON.stringify(short)};
const lines = readFileSync(file, 'utf8').split('\\n');
let done = false;
for (let i = 0; i < lines.length; i++) {
  if (!done && lines[i].startsWith('pick ' + short)) {
    lines[i] = lines[i].replace(/^pick /, 'reword ');
    done = true;
  }
}
writeFileSync(file, lines.join('\\n'));
`,
      { mode: 0o755 },
    );

    // 提交信息编辑器：用预设文本覆盖提交信息文件
    const messageFile = join(dir, 'message.txt');
    await writeFile(messageFile, message, 'utf8');
    const editorScript = join(dir, 'editor.mjs');
    await writeFile(
      editorScript,
      `#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
writeFileSync(process.argv[2], readFileSync(${JSON.stringify(messageFile)}, 'utf8'));
`,
      { mode: 0o755 },
    );

    await gitExecStrict(['rebase', '-i', `${hash}^`], {
      ...options,
      env: {
        ...options.env,
        GIT_SEQUENCE_EDITOR: sequenceScript,
        GIT_EDITOR: editorScript,
      },
    });
  });
}

/**
 * 删除指定提交
 * HEAD 提交使用 reset --soft HEAD~1（改动保留在暂存区）；
 * 非 HEAD 提交走交互式 rebase 的 drop。
 * @param hash 目标提交哈希
 * @param options Git 命令选项
 */
export async function dropCommit(hash: string, options: GitCommandOptions): Promise<void> {
  await assertWorkingTreeClean(options);
  if (await isHeadCommit(hash, options)) {
    await gitExecStrict(['reset', '--soft', 'HEAD~1'], options);
    return;
  }

  await withTempDir(async (dir) => {
    const short = hash.slice(0, 7);
    const sequenceScript = join(dir, 'sequence-editor.mjs');
    await writeFile(
      sequenceScript,
      `#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
const file = process.argv[2];
const short = ${JSON.stringify(short)};
const lines = readFileSync(file, 'utf8').split('\\n');
let done = false;
for (let i = 0; i < lines.length; i++) {
  if (!done && lines[i].startsWith('pick ' + short)) {
    lines[i] = lines[i].replace(/^pick /, 'drop ');
    done = true;
  }
}
writeFileSync(file, lines.join('\\n'));
`,
      { mode: 0o755 },
    );

    await gitExecStrict(['rebase', '-i', `${hash}^`], {
      ...options,
      env: {
        ...options.env,
        GIT_SEQUENCE_EDITOR: sequenceScript,
      },
    });
  });
}

/**
 * 推送当前分支到指定提交为止的所有提交
 * 仅推送包含该提交的本地分支；非快进时抛错提示需先拉取。
 * @param hash 目标提交哈希
 * @param branch 当前分支名
 * @param options Git 命令选项
 * @returns 推送的引用说明，如 "main -> origin/main"
 */
export async function pushUpToCommit(
  hash: string,
  branch: string,
  options: GitCommandOptions
): Promise<string> {
  // 校验目标提交确实是该分支的祖先，避免推送无关提交
  const ancestorCheck = await gitExec(
    ['merge-base', '--is-ancestor', hash, branch],
    options
  ).catch(() => null);
  if (!ancestorCheck || ancestorCheck.exitCode !== 0) {
    throw new Error(`提交 ${hash.slice(0, 7)} 不在分支 ${branch} 的历史中`);
  }

  await gitExecStrict(['push', 'origin', branch], options);
  return `${branch} -> origin/${branch}`;
}
