/**
 * 插件侧的补充 git 操作
 * core 未覆盖但界面需要的操作集中在这里，统一走 core 的 gitExecStrict，
 * 保证错误处理、超时与环境变量行为与 core 一致。
 */

import { gitExecStrict } from '@git-manage/core';

/**
 * Cherry-pick 指定提交到当前分支
 * @param hash 提交哈希
 * @param cwd 仓库根目录
 */
export async function cherryPickCommit(hash: string, cwd: string): Promise<void> {
  await gitExecStrict(['cherry-pick', hash], { cwd });
}

/**
 * 回滚指定提交（生成一条反向提交）
 * @param hash 提交哈希
 * @param cwd 仓库根目录
 */
export async function revertCommit(hash: string, cwd: string): Promise<void> {
  await gitExecStrict(['revert', '--no-edit', hash], { cwd });
}
