/**
 * acquireVsCodeApi 的类型描述
 * 该 API 由 VS Code webview 宿主注入，jsdom 测试中由测试替身提供
 */

/** webview 与主进程通信的消息 */
export interface PostMessage {
  type: 'request' | 'log';
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  level?: string;
  prefix?: string;
  message?: string;
  data?: unknown;
}

/** VS Code 注入的 webview API */
export interface VsCodeApi {
  postMessage(message: PostMessage): void;
  getState?(): unknown;
  setState?(state: unknown): void;
}
