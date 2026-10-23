import { gitExec } from './executor.js';

/**
 * 列出仓库中所有已跟踪的文件（等价 `git ls-files`）
 *
 * 使用 `-z` 以 NUL 分隔输出，保证文件名含空格、换行等特殊字符时不会被拆碎；
 * 未跟踪文件（untracked）不会出现在结果中。
 *
 * @param cwd - 工作目录
 * @returns 已跟踪文件路径列表（相对仓库根）
 */
export async function listTrackedFiles(cwd: string): Promise<string[]> {
  const result = await gitExec(['ls-files', '-z'], { cwd });

  if (!result.stdout) {
    return [];
  }

  // 按 NUL 切分后去掉末尾因分隔符产生的空串
  const files = result.stdout.split('\0').filter((file) => file !== '');
  return files;
}
