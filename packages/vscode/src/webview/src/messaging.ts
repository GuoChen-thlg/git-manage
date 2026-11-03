/**
 * 请求管理：call() 与消息响应配对
 * 从 script.ts 原样迁移
 */

import type { VsCodeApi } from './api';
import { setVsCodeApi } from './dom';
import { loadAll, loadDetail } from './data';
import { toast } from './dialogs';

/** 请求序号 */
let seq = 0;
/** 等待响应的请求表 */
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

/**
 * 调用主进程方法
 * @param method 方法名
 * @param params 参数
 * @returns 结果或抛错
 */
export function call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    vscodePost({ type: 'request', id, method, params: params || {} });
  });
}

/** vscode api 引用（由 init 注入） */
let apiRef: VsCodeApi | undefined;

/**
 * 注入 vscode api（入口调用）
 * @param api API 实例
 */
export function initCall(api: VsCodeApi): void {
  apiRef = api;
  setVsCodeApi(api);
}

/** 发消息给主进程（api 未注入时忽略，jsdom 单测中始终已注入） */
function vscodePost(message: unknown): void {
  apiRef?.postMessage(message as never);
}

/**
 * 处理主进程回包与事件（入口的 message 监听调用）
 * @param message 消息数据
 */
export function handleHostMessage(message: {
  type?: string; id?: number; ok?: boolean; data?: unknown; error?: string;
  name?: string; payload?: unknown;
}): void {
  if (!message) return;

  if (message.type === 'response') {
    const waiter = pending.get(message.id as number);
    if (!waiter) return;
    pending.delete(message.id as number);
    if (message.ok) waiter.resolve(message.data);
    else waiter.reject(new Error(message.error || '未知错误'));
    return;
  }

  if (message.type === 'event') {
    if (message.name === 'repositoryChanged') { void loadAll(); }
    if (message.name === 'focusCommit' && message.payload) { void loadDetail(String(message.payload)); }
    if (message.name === 'toast') { toast(String(message.payload), false); }
  }
}
