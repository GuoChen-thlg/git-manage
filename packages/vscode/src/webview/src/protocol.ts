/**
 * Webview 与扩展主进程的通信协议（webview 侧视图）
 * 类型与 ../protocol.ts 保持一致；webview 侧不能 import @git-manage/core，
 * 因此这里用结构化类型重述，不引入 node/vscode 依赖。
 */

/** 差异行类型（unified diff 的一行） */
export interface DiffLine {
  type: 'context' | 'add' | 'delete';
  content: string;
  oldLine?: number;
  newLine?: number;
}

/** 变更文件差异 */
export interface FileDiff {
  path?: string;
  file?: string;
  additions?: number;
  deletions?: number;
  lines: DiffLine[];
}

/** 分支 */
export interface Branch {
  name: string;
  isCurrent?: boolean;
  isRemote?: boolean;
  message?: string;
}

/** 提交 */
export interface Commit {
  hash: string;
  shortHash: string;
  message: string;
  authorName: string;
  date: string;
  parents?: string[];
}

/** 提交详情 */
export interface CommitDetail {
  hash: string;
  shortHash?: string;
  message: string;
  authorName: string;
  authorEmail: string;
  date: string;
  parents?: string[];
}

/** webview 发往主进程的请求 */
export interface WebviewRequest {
  type: 'request';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

/** 主进程返回的响应 */
export interface ExtensionResponse {
  type: 'response';
  id: number;
  ok: boolean;
  data?: unknown;
  error?: string;
}

/** 主进程主动推送的事件 */
export interface ExtensionEvent {
  type: 'event';
  name: 'repositoryChanged' | 'toast' | 'focusCommit';
  payload?: unknown;
}
