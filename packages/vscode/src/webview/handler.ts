/**
 * Webview 请求处理器
 * 把 webview 发来的请求映射到 core 的 git 能力。
 * 本层只负责参数校验与调用，错误统一返回给 webview 由界面提示。
 */

import {
  addWorktree,
  checkout,
  checkoutNew,
  clearGitCommandLogs,
  createBranch,
  deleteBranch,
  fetch,
  findMyBranches,
  getBranches,
  getGitCommandLogs,
  listTrackedFiles,
  listWorktrees,
  pruneWorktrees,
  removeWorktree,
  getCommitDetail,
  getCommitFileDiffs,
  getCommitLog,
  getStatus,
  pull,
  push,
  renameBranch,
  uncommitHead,
} from '@git-manage/core';
import { cherryPickCommit, revertCommit } from '../git-ops';
import type { RequestMethod, RequestParams } from './protocol';
import { debug, trace } from '../logger';

/**
 * 面板所需的本地存储
 * 收藏分支等数据与 git 仓库无关，存到扩展的 workspaceState，不写进仓库
 */
export interface WebviewStore {
  /** 读取收藏分支 */
  getFavorites(): string[];
  /** 保存收藏分支 */
  setFavorites(names: string[]): void;
}

/**
 * 处理一次请求
 * @param method 方法名
 * @param params 参数
 * @param root 仓库根目录
 * @returns 方法返回值
 */
export async function handleRequest(
  method: RequestMethod,
  params: RequestParams,
  root: string,
  store: WebviewStore,
): Promise<unknown> {
  const cwd = root;
  // 记录请求入口与参数，排查「操作无效」时首先看这里
  debug('handler', 'request', { method, params, root });

  return trace('handler', method, async () => {
  switch (method) {
    case 'getBranches':
      return getBranches(cwd);

    case 'getCommitLog':
      // 路径过滤交给 git，避免只过滤已加载的少量提交
      // limit 为 0 或未指定时取全量（core 在不传 maxCount 时不会加 --max-count）
      return getCommitLog(cwd, params.limit ?? 0, params.branch, params.paths);

    case 'getCommitDetail':
      return getCommitDetail(cwd, required(params.hash, 'hash'));

    case 'getCommitDiffs':
      return getCommitFileDiffs(cwd, required(params.hash, 'hash'));

    case 'getStatus':
      return getStatus({ cwd });

    case 'checkoutBranch':
      return checkout(required(params.branch, 'branch'), { cwd });

    case 'createBranch': {
      const name = required(params.name, 'name');
      return params.checkoutAfter === false
        ? createBranch(name, { cwd })
        : checkoutNew(name, { cwd });
    }

    case 'deleteBranch':
      return deleteBranch(required(params.name, 'name'), { cwd }, params.force === true);

    case 'renameBranch':
      return renameBranch(
        required(params.name, 'name'),
        required(params.newName, 'newName'),
        { cwd },
      );

    case 'cherryPick':
      return cherryPickCommit(required(params.hash, 'hash'), cwd);

    case 'revert':
      return revertCommit(required(params.hash, 'hash'), cwd);

    case 'undoCommit':
      return uncommitHead(required(params.hash, 'hash'), { cwd });

    case 'fetch':
      return fetch({ cwd });

    case 'pull':
      return pull({ cwd });

    case 'push':
      return push({ cwd });

    case 'getFavorites':
      return store.getFavorites();

    case 'saveFavorites':
      return store.setFavorites(params.favorites ?? []);

    case 'getMyBranches':
      return findMyBranches({ cwd });

    case 'listFiles':
      // 路径树选择需要完整的已跟踪文件列表
      return listTrackedFiles(root);

    case 'getCommandLogs':
      return getGitCommandLogs(params.since ?? 0);

    case 'clearCommandLogs':
      return clearGitCommandLogs();

    case 'listWorktrees':
      return listWorktrees({ cwd });

    case 'addWorktree':
      return addWorktree(
        required(params.path, 'path'),
        required(params.branchName, 'branchName'),
        false,
        undefined,
        { cwd },
      );

    case 'removeWorktree':
      return removeWorktree(required(params.path, 'path'), params.force === true, { cwd });

    case 'pruneWorktrees':
      return pruneWorktrees({ cwd });

    default: {
      // 穷尽检查：新增方法未实现时在编译期报错
      const never: never = method;
      throw new Error(`未实现的方法：${String(never)}`);
    }
  }
  });
}

/**
 * 校验必填参数
 * @param value 参数值
 * @param field 字段名
 * @returns 参数值
 */
function required(value: string | undefined, field: string): string {
  if (!value) throw new Error(`缺少参数：${field}`);
  return value;
}
