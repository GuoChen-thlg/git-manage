/**
 * 错误提示工具
 * 统一「操作失败必须让用户看到」的处理：把 git 原始错误归类成可读文案，并通过宿主 toast 展示。
 *
 * 背景：历史上多处 catch 只写 console.error，用户点击后界面毫无反应，误以为「功能坏了」。
 * 凡是由用户动作触发、且用户期待结果的操作，失败一律经 showOperationError 提示。
 */

import type { HostClient } from '@openchamber/sdk';
import { host } from '../host';
import { t } from '../i18n';

/**
 * 按错误内容归类 git 操作失败原因
 * @param message 原始错误信息
 * @returns 用于提示的文案键；无法归类时返回 null
 */
export function classifyGitError(message: string): string | null {
  const text = message.toLowerCase();
  if (text.includes('conflict') || text.includes('merge conflict')) return 'op.conflict';
  if (
    text.includes('authentication failed')
    || text.includes('could not read username')
    || text.includes('permission denied')
  ) return 'op.authFailed';
  if (
    text.includes('could not resolve host')
    || text.includes('connection refused')
    || text.includes('connection timed out')
  ) return 'op.unreachable';
  if (text.includes('rejected') || text.includes('non-fast-forward')) return 'op.rejected';
  return null;
}

/**
 * 归类创建分支失败原因，用于给出可读的简短提示
 * @param message git 原始错误
 * @returns 文案键
 */
export function classifyCreateBranchError(message: string): string {
  const text = message.toLowerCase();
  // 工作区改动会被 checkout 覆盖时 git 拒绝建分支
  if (text.includes('would be overwritten') || text.includes('please commit your changes')) {
    return 'op.branchDirtyWorkingTree';
  }
  if (text.includes('already exists')) return 'op.branchExists';
  if (text.includes('not a valid branch name') || text.includes('invalid branch name')) {
    return 'op.branchInvalidName';
  }
  return 'op.branchCreateGeneric';
}

/**
 * 从任意异常中取出可读文本
 * @param error 异常
 * @returns 错误文本
 */
export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 向用户展示操作失败提示
 * 已知类型给出归类文案，未知类型附带原始错误；两者都保留原文供复制排查
 * @param error 捕获到的异常
 * @param fallbackKey 兜底文案键（如操作名 + 失败）
 * @param logPrefix 日志前缀，便于按模块过滤
 * @param event 日志事件名
 * @param hostClient 宿主客户端；组件已通过参数接收 host 时传它，保证与组件其他提示走同一通道
 */
export function showOperationError(
  error: unknown,
  fallbackKey: string,
  logPrefix: string,
  event: string,
  hostClient: Pick<HostClient, 'toast'> = host,
): void {
  const message = errorText(error);
  console.error(JSON.stringify({ prefix: logPrefix, event, error: message }));

  const reasonKey = classifyGitError(message);
  const text = reasonKey
    ? `${t(reasonKey)}: ${message}`
    : `${t(fallbackKey)}: ${message}`;

  void hostClient.toast({ kind: 'error', message: text, copy: true, dismiss: true })
    .catch((toastErr) => {
      console.error(JSON.stringify({ prefix: logPrefix, event: `${event}_toast_error`, error: String(toastErr) }));
    });
}
