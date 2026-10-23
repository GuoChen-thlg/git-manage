import { gitExec, gitExecStrict } from './executor.js';
import type { GitCommandOptions, Remote } from './types.js';

/**
 * 获取远程仓库列表
 * @param options - Git 命令选项
 * @returns 远程仓库列表
 */
export async function listRemotes(options: GitCommandOptions): Promise<Remote[]> {
  const result = await gitExec('remote -v', options);

  if (!result.stdout) {
    return [];
  }

  const remoteMap = new Map<string, Remote>();

  for (const line of result.stdout.split('\n')) {
    if (!line.trim()) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;

    const name = parts[0];
    const url = parts[1];
    const isPush = parts[2] === '(push)';

    if (!remoteMap.has(name)) {
      remoteMap.set(name, { name, url });
    }

    if (isPush) {
      remoteMap.get(name)!.pushUrl = url;
    }
  }

  return Array.from(remoteMap.values());
}

/**
 * 添加远程仓库
 * @param name - 远程名称
 * @param url - 远程 URL
 * @param options - Git 命令选项
 */
export async function addRemote(
  name: string,
  url: string,
  options: GitCommandOptions
): Promise<void> {
  await gitExecStrict(`remote add ${name} ${url}`, options);
}

/**
 * 删除远程仓库
 * @param name - 远程名称
 * @param options - Git 命令选项
 */
export async function removeRemote(name: string, options: GitCommandOptions): Promise<void> {
  await gitExecStrict(`remote remove ${name}`, options);
}

/**
 * 重命名远程仓库
 * @param oldName - 原远程名称
 * @param newName - 新远程名称
 * @param options - Git 命令选项
 */
export async function renameRemote(
  oldName: string,
  newName: string,
  options: GitCommandOptions
): Promise<void> {
  await gitExecStrict(`remote rename ${oldName} ${newName}`, options);
}

/**
 * 获取远程仓库 URL
 * @param name - 远程名称
 * @param options - Git 命令选项
 * @returns 远程 URL
 */
export async function getRemoteUrl(name: string, options: GitCommandOptions): Promise<string> {
  const result = await gitExecStrict(`remote get-url ${name}`, options);
  return result.stdout;
}

/**
 * 设置远程仓库 URL
 * @param name - 远程名称
 * @param url - 新 URL
 * @param options - Git 命令选项
 */
export async function setRemoteUrl(
  name: string,
  url: string,
  options: GitCommandOptions
): Promise<void> {
  await gitExecStrict(`remote set-url ${name} ${url}`, options);
}

/**
 * 获取远程仓库信息
 * @param name - 远程名称
 * @param options - Git 命令选项
 * @returns 远程信息
 */
export async function getRemoteInfo(
  name: string,
  options: GitCommandOptions
): Promise<{ url: string; pushUrl?: string }> {
  const result = await gitExec(`remote show ${name}`, options);

  let url = '';
  let pushUrl: string | undefined;

  for (const line of result.stdout.split('\n')) {
    if (line.includes('Fetch URL:')) {
      url = line.split('Fetch URL:')[1].trim();
    } else if (line.includes('Push URL:')) {
      pushUrl = line.split('Push URL:')[1].trim();
    }
  }

  return { url, pushUrl };
}

/**
 * 拉取远程更改
 * @param options - Git 命令选项
 * @param remote - 远程名称（默认 origin）
 * @param branch - 分支名称（默认当前分支）
 */
export async function fetch(
  options: GitCommandOptions,
  remote: string = 'origin',
  branch?: string
): Promise<void> {
  const args = branch 
    ? `fetch ${remote} ${branch}`
    : `fetch ${remote}`;
  await gitExecStrict(args, options);
}

/**
 * 拉取并合并
 * @param options - Git 命令选项
 * @param remote - 远程名称（默认 origin）
 * @param branch - 分支名称（默认当前分支）
 */
export async function pull(
  options: GitCommandOptions,
  remote: string = 'origin',
  branch?: string
): Promise<void> {
  const args = branch 
    ? `pull ${remote} ${branch}`
    : `pull ${remote}`;
  await gitExecStrict(args, options);
}

/**
 * 推送到远程
 * @param options - Git 命令选项
 * @param remote - 远程名称（默认 origin）
 * @param branch - 分支名称（默认当前分支）
 */
export async function push(
  options: GitCommandOptions,
  remote: string = 'origin',
  branch?: string
): Promise<void> {
  const args = branch 
    ? `push ${remote} ${branch}`
    : `push ${remote}`;
  await gitExecStrict(args, options);
}

/**
 * 强制推送到远程
 * @param options - Git 命令选项
 * @param remote - 远程名称（默认 origin）
 * @param branch - 分支名称（默认当前分支）
 */
export async function forcePush(
  options: GitCommandOptions,
  remote: string = 'origin',
  branch?: string
): Promise<void> {
  const args = branch 
    ? `push --force ${remote} ${branch}`
    : `push --force ${remote}`;
  await gitExecStrict(args, options);
}

/**
 * 设置上游分支
 * @param options - Git 命令选项
 * @param remote - 远程名称（默认 origin）
 * @param branch - 分支名称（默认当前分支）
 */
export async function setUpstream(
  options: GitCommandOptions,
  remote: string = 'origin',
  branch?: string
): Promise<void> {
  const currentBranch = branch || (await gitExec('branch --show-current', options)).stdout;
  await gitExecStrict(`branch --set-upstream-to=${remote}/${currentBranch} ${currentBranch}`, options);
}
