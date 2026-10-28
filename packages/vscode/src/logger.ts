/**
 * 统一日志系统
 * 目标：任何问题都能从输出通道里查到完整链路，而不是靠猜。
 *
 * 三层结构：
 *   1. 扩展主进程 → VS Code 输出通道「Git Manager for VS Code」
 *   2. Webview 内 → 转发到主进程，与主进程日志合并到同一通道
 *   3. 关键错误 → 额外弹提示，保证用户可见
 *
 * 日志格式统一为单行 JSON，便于过滤：
 *   [git-manager] 2026-01-02T10:00:00.000Z INFO  [prefix] message {"k":"v"}
 */

import * as vscode from 'vscode';

/** 日志级别 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** 输出通道（延迟创建，避免模块加载时就占用资源） */
let channel: vscode.OutputChannel | undefined;

/** 是否输出 debug 级别 */
let debugEnabled = false;

/**
 * 初始化日志系统
 * @param options 配置
 */
export function initLogger(options: { debug?: boolean } = {}): void {
  debugEnabled = options.debug === true;
  if (!channel) {
    channel = vscode.window.createOutputChannel('Git Manager for VS Code');
  }
}

/**
 * 获取输出通道，供外部注册为可释放资源
 * @returns 输出通道
 */
export function getLogChannel(): vscode.OutputChannel | undefined {
  return channel;
}

/**
 * 写入一条日志
 * @param level 级别
 * @param prefix 模块前缀，如 'panel'、'handler'
 * @param message 描述
 * @param data 附加数据
 */
export function log(level: LogLevel, prefix: string, message: string, data?: unknown): void {
  if (level === 'debug' && !debugEnabled) return;

  // 未初始化时退化为输出到控制台，避免日志静默丢失
  if (!channel) {
    // eslint-disable-next-line no-console
    console.log(`[${level.toUpperCase()}] [${prefix}] ${message}`, data ?? '');
    return;
  }

  const time = new Date().toISOString();
  let extra = '';
  if (data !== undefined) {
    try {
      extra = ' ' + JSON.stringify(data);
    } catch {
      // 循环引用等无法序列化时退化为字符串
      extra = ' ' + String(data);
    }
  }
  channel.appendLine(`[git-manager] ${time} ${level.toUpperCase().padEnd(5)} [${prefix}] ${message}${extra}`);
}

/** 便捷方法：调试 */
export const debug = (prefix: string, message: string, data?: unknown): void => log('debug', prefix, message, data);
/** 便捷方法：信息 */
export const info = (prefix: string, message: string, data?: unknown): void => log('info', prefix, message, data);
/** 便捷方法：警告 */
export const warn = (prefix: string, message: string, data?: unknown): void => log('warn', prefix, message, data);
/** 便捷方法：错误 */
export const error = (prefix: string, message: string, data?: unknown): void => log('error', prefix, message, data);

/**
 * 包装一次异步操作，自动记录开始、成功与失败
 * 用于所有可能失败的用户操作，避免出现「点了没反应」且无迹可查
 * @param prefix 模块前缀
 * @param action 操作名
 * @param fn 实际操作
 * @returns 操作结果
 */
export async function trace<T>(prefix: string, action: string, fn: () => Promise<T>): Promise<T> {
  const started = Date.now();
  debug(prefix, `${action}_start`);
  try {
    const result = await fn();
    info(prefix, `${action}_done`, { durationMs: Date.now() - started });
    return result;
  } catch (err) {
    error(prefix, `${action}_failed`, {
      durationMs: Date.now() - started,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  }
}

/**
 * 释放日志资源
 */
export function disposeLogger(): void {
  channel?.dispose();
  channel = undefined;
}
