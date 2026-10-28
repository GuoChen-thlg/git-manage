/**
 * git 可执行文件定位
 * 背景：从 Dock / GUI 启动 VS Code 时，进程 PATH 往往不含 Homebrew、MacPorts 等
 * 用户级安装目录，导致子进程报 `spawn git ENOENT`，插件所有 git 功能失效。
 *
 * 对策：启动时探测常见安装路径，找到后把其目录补进 process.env.PATH，
 * 使 core 内部通过 execFile('git') 调用时能够命中。
 */

import { existsSync } from 'node:fs';
import { delimiter, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { info, warn } from './logger';

/** git 常见安装路径（按优先级） */
const GIT_CANDIDATES = [
  // 系统自带优先：它指向真实可执行文件，而 Homebrew 的 git 是符号链接，
  // 某些受限环境（如扩展宿主沙箱）解析链接会失败
  '/usr/bin/git',
  '/opt/homebrew/bin/git',
  '/usr/local/bin/git',
  '/opt/local/bin/git',
  'C:\\Program Files\\Git\\cmd\\git.exe',
];

/**
 * 确保 git 可被找到
 * @returns 找到的 git 路径；无法找到时返回 null
 */
export function ensureGitAvailable(): string | null {
  // 1. 先看当前 PATH 能否直接调用
  try {
    const version = execFileSync('git', ['--version'], { encoding: 'utf-8' }).trim();
    info('git', 'git_found_in_path', { version });
    return 'git';
  } catch {
    // 继续探测
  }

  // 2. 从候选路径里找，命中后把目录补进 PATH
  for (const candidate of GIT_CANDIDATES) {
    if (!existsSync(candidate)) continue;
    const dir = dirname(candidate);
    const current = process.env.PATH ?? '';
    if (!current.split(delimiter).includes(dir)) {
      process.env.PATH = `${dir}${delimiter}${current}`;
    }
    try {
      const version = execFileSync(candidate, ['--version'], { encoding: 'utf-8' }).trim();
      info('git', 'git_found_by_probe', { path: candidate, version });
      return candidate;
    } catch {
      // 候选路径不可执行，继续
    }
  }

  warn('git', 'git_not_found', { candidates: GIT_CANDIDATES });
  return null;
}
