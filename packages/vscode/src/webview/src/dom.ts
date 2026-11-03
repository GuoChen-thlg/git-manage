/**
 * DOM 工具与日志转发
 * 从 script.ts 原样迁移
 */

import type { VsCodeApi } from './api';

/** vscode api 由入口注入（jsdom 测试中可替换） */
export let vscode: VsCodeApi | undefined;

/**
 * 注入 vscode api（入口处调用一次）
 * @param api acquireVsCodeApi 的返回值
 */
export function setVsCodeApi(api: VsCodeApi): void {
  vscode = api;
}

/**
 * 创建 DOM 元素
 * @param tag 标签名
 * @param cls 类名
 * @param text 文本内容
 * @returns 元素
 */
export function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * 写入日志：同时输出到 webview 控制台并转发到主进程输出通道
 * @param level 级别
 * @param prefix 模块前缀
 * @param message 描述
 * @param data 附加数据
 */
export function log(level: 'debug' | 'warn' | 'error', prefix: string, message: string, data?: unknown): void {
  try {
    vscode?.postMessage({ type: 'log', level: level, prefix: prefix, message: message, data: data });
  } catch {
    // 转发失败不影响主流程
  }
  const text = '[' + prefix + '] ' + message;
  if (level === 'error') console.error(text, data === undefined ? '' : data);
  else if (level === 'warn') console.warn(text, data === undefined ? '' : data);
  else console.log(text, data === undefined ? '' : data);
}

/** 调试日志 */
export function logDebug(prefix: string, message: string, data?: unknown): void { log('debug', prefix, message, data); }
/** 错误日志 */
export function logError(prefix: string, message: string, data?: unknown): void { log('error', prefix, message, data); }
