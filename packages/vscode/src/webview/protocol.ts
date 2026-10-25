/**
 * Webview 与扩展主进程的通信协议
 * 统一消息形状，避免两端各自发明字段导致对不上。
 *
 * 方向约定：
 *   webview -> extension：{ type: 'request', id, method, params }
 *   extension -> webview：{ type: 'response', id, ok, data | error }
 *   extension -> webview：{ type: 'event', name, payload }（推送类，如刷新通知）
 */

import type { Branch, Commit, CommitDetail, FileDiff, StatusResult } from '@git-manage/core';

/** 请求方法名 */
export type RequestMethod =
  | 'getBranches'
  | 'getCommitLog'
  | 'getCommitDetail'
  | 'getCommitDiffs'
  | 'getStatus'
  | 'checkoutBranch'
  | 'createBranch'
  | 'deleteBranch'
  | 'renameBranch'
  | 'cherryPick'
  | 'revert'
  | 'undoCommit'
  | 'fetch'
  | 'pull'
  | 'push'
  | 'getFavorites'
  | 'saveFavorites'
  | 'getMyBranches'
  | 'listFiles'
  | 'getCommandLogs'
  | 'clearCommandLogs'
  | 'listWorktrees'
  | 'addWorktree'
  | 'removeWorktree'
  | 'pruneWorktrees';

/** 请求参数形状按方法区分 */
export interface RequestParams {
  /** 按分支过滤日志、或指定的目标分支 */
  branch?: string;
  /** 提交数量上限 */
  limit?: number;
  /** 路径过滤（交给 git 的 pathspec，多个为并集） */
  paths?: string[];
  /** 提交哈希 */
  hash?: string;
  /** 分支名 */
  name?: string;
  /** 重命名后的新名称 */
  newName?: string;
  /** 创建后是否检出 */
  checkoutAfter?: boolean;
  /** 删除是否强制 */
  force?: boolean;
  /** 推送目标分支 */
  targetBranch?: string;
  /** 收藏的分支名列表 */
  favorites?: string[];
  /** 命令日志增量起点 id */
  since?: number;
  /** worktree 路径 */
  path?: string;
  /** worktree 绑定分支 */
  branchName?: string;
}

/** webview 发往主进程的请求 */
export interface WebviewRequest {
  type: 'request';
  /** 请求标识，用于响应配对 */
  id: number;
  method: RequestMethod;
  params?: RequestParams;
}

/** 主进程返回的响应 */
export interface ExtensionResponse {
  type: 'response';
  id: number;
  ok: boolean;
  /** 成功时的数据 */
  data?: unknown;
  /** 失败时的错误信息 */
  error?: string;
}

/** 主进程主动推送的事件 */
export interface ExtensionEvent {
  type: 'event';
  name: 'repositoryChanged' | 'toast';
  payload?: unknown;
}

/** 方法对应的返回类型，供主进程实现时对齐 */
export interface MethodResults {
  getBranches: Branch[];
  getCommitLog: Commit[];
  getCommitDetail: CommitDetail | null;
  getCommitDiffs: FileDiff[];
  getStatus: StatusResult;
  checkoutBranch: void;
  createBranch: void;
  deleteBranch: void;
  renameBranch: void;
  cherryPick: void;
  revert: void;
  undoCommit: void;
  fetch: void;
  pull: void;
  push: void;
  getFavorites: string[];
  saveFavorites: void;
  getMyBranches: string[];
  listFiles: string[];
  getCommandLogs: unknown[];
  clearCommandLogs: void;
  listWorktrees: unknown[];
  addWorktree: void;
  removeWorktree: void;
  pruneWorktrees: void;
}
