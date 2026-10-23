import { gitExec } from './executor.js';
import type { GitCommandOptions, FileDiff, DiffLine } from './types.js';

/**
 * 解析差异行
 * @param line - 差异行文本
 * @param lineType - 行类型
 * @param newLineNum - 新文件行号
 * @param oldLineNum - 旧文件行号
 * @returns 解析后的差异行
 */
function parseDiffLine(
  line: string,
  lineType: DiffLine['type'],
  newLineNum: number,
  oldLineNum: number
): DiffLine {
  return {
    type: lineType,
    content: line.substring(1),
    newLine: lineType !== 'delete' ? newLineNum : undefined,
    oldLine: lineType !== 'add' ? oldLineNum : undefined,
  };
}

/**
 * 解析 unified diff 输出
 * @param diffOutput - diff 命令输出
 * @returns 差异行列表
 */
function parseUnifiedDiff(diffOutput: string): DiffLine[] {
  const lines: DiffLine[] = [];
  let newLineNum = 0;
  let oldLineNum = 0;

  for (const line of diffOutput.split('\n')) {
    // 解析 hunk 头部
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLineNum = parseInt(match[1], 10) - 1;
        newLineNum = parseInt(match[2], 10) - 1;
      }
      continue;
    }

    // 跳过文件名信息
    if (line.startsWith('diff --git') || line.startsWith('index ') || 
        line.startsWith('---') || line.startsWith('+++')) {
      continue;
    }

    if (line.startsWith('+')) {
      newLineNum++;
      lines.push(parseDiffLine(line, 'add', newLineNum, oldLineNum));
    } else if (line.startsWith('-')) {
      oldLineNum++;
      lines.push(parseDiffLine(line, 'delete', newLineNum, oldLineNum));
    } else if (line.startsWith(' ') || line === '') {
      newLineNum++;
      oldLineNum++;
      lines.push(parseDiffLine(line, 'context', newLineNum, oldLineNum));
    }
  }

  return lines;
}

/**
 * 获取文件差异
 * @param path - 文件路径
 * @param options - Git 命令选项
 * @returns 文件差异
 */
export async function getFileDiff(path: string, options: GitCommandOptions): Promise<FileDiff> {
  const result = await gitExec(`diff -- ${path}`, options);
  
  const lines = parseUnifiedDiff(result.stdout);
  const additions = lines.filter(l => l.type === 'add').length;
  const deletions = lines.filter(l => l.type === 'delete').length;

  return {
    path,
    additions,
    deletions,
    lines,
  };
}

/**
 * 获取暂存区差异
 * @param options - Git 命令选项
 * @returns 文件差异列表
 */
export async function getStagedDiff(options: GitCommandOptions): Promise<FileDiff[]> {
  const result = await gitExec('diff --cached', options);
  
  if (!result.stdout) {
    return [];
  }

  // 按文件分割差异
  const fileDiffs: FileDiff[] = [];
  const fileSections = result.stdout.split('diff --git ');

  for (const section of fileSections) {
    if (!section.trim()) continue;

    // 提取文件路径
    const pathMatch = section.match(/b\/(.+)$/m);
    if (!pathMatch) continue;

    const path = pathMatch[1];
    const lines = parseUnifiedDiff('diff --git ' + section);
    const additions = lines.filter(l => l.type === 'add').length;
    const deletions = lines.filter(l => l.type === 'delete').length;

    fileDiffs.push({
      path,
      additions,
      deletions,
      lines,
    });
  }

  return fileDiffs;
}

/**
 * 获取工作区差异
 * @param options - Git 命令选项
 * @returns 文件差异列表
 */
export async function getWorkingDiff(options: GitCommandOptions): Promise<FileDiff[]> {
  const result = await gitExec('diff', options);
  
  if (!result.stdout) {
    return [];
  }

  const fileDiffs: FileDiff[] = [];
  const fileSections = result.stdout.split('diff --git ');

  for (const section of fileSections) {
    if (!section.trim()) continue;

    const pathMatch = section.match(/b\/(.+)$/m);
    if (!pathMatch) continue;

    const path = pathMatch[1];
    const lines = parseUnifiedDiff('diff --git ' + section);
    const additions = lines.filter(l => l.type === 'add').length;
    const deletions = lines.filter(l => l.type === 'delete').length;

    fileDiffs.push({
      path,
      additions,
      deletions,
      lines,
    });
  }

  return fileDiffs;
}

/**
 * 获取两个提交之间的差异
 * @param from - 起始提交哈希
 * @param to - 结束提交哈希
 * @param options - Git 命令选项
 * @returns 文件差异列表
 */
export async function getCommitDiff(
  from: string,
  to: string,
  options: GitCommandOptions
): Promise<FileDiff[]> {
  const result = await gitExec(`diff ${from} ${to}`, options);
  
  if (!result.stdout) {
    return [];
  }

  const fileDiffs: FileDiff[] = [];
  const fileSections = result.stdout.split('diff --git ');

  for (const section of fileSections) {
    if (!section.trim()) continue;

    const pathMatch = section.match(/b\/(.+)$/m);
    if (!pathMatch) continue;

    const path = pathMatch[1];
    const lines = parseUnifiedDiff('diff --git ' + section);
    const additions = lines.filter(l => l.type === 'add').length;
    const deletions = lines.filter(l => l.type === 'delete').length;

    fileDiffs.push({
      path,
      additions,
      deletions,
      lines,
    });
  }

  return fileDiffs;
}

/**
 * 获取文件相对于某个提交的差异
 * @param path - 文件路径
 * @param commit - 提交哈希（默认 HEAD）
 * @param options - Git 命令选项
 * @returns 文件差异
 */
export async function getFileDiffAtCommit(
  path: string,
  commit: string = 'HEAD',
  options: GitCommandOptions
): Promise<FileDiff> {
  const result = await gitExec(`diff ${commit} -- ${path}`, options);
  
  const lines = parseUnifiedDiff(result.stdout);
  const additions = lines.filter(l => l.type === 'add').length;
  const deletions = lines.filter(l => l.type === 'delete').length;

  return {
    path,
    additions,
    deletions,
    lines,
  };
}

/**
 * 获取两个分支之间的差异文件列表
 * @param from - 源分支
 * @param to - 目标分支
 * @param options - Git 命令选项
 * @returns 差异文件列表
 */
export async function getBranchDiffFiles(
  from: string,
  to: string,
  options: GitCommandOptions
): Promise<FileDiff[]> {
  const result = await gitExec(`diff ${from}...${to}`, options);
  
  if (!result.stdout) {
    return [];
  }

  const fileDiffs: FileDiff[] = [];
  const fileSections = result.stdout.split('diff --git ');

  for (const section of fileSections) {
    if (!section.trim()) continue;

    const pathMatch = section.match(/b\/(.+)$/m);
    if (!pathMatch) continue;

    const path = pathMatch[1];
    const lines = parseUnifiedDiff('diff --git ' + section);
    const additions = lines.filter(l => l.type === 'add').length;
    const deletions = lines.filter(l => l.type === 'delete').length;

    fileDiffs.push({
      path,
      additions,
      deletions,
      lines,
    });
  }

  return fileDiffs;
}
