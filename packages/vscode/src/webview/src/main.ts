/**
 * 面板前端入口
 * 原先以模板字符串注入 webview，现经 esbuild 打包为 IIFE 单文件后由 panel.ts 外链引用。
 *
 * 结构：api 注入 -> 消息路由 -> 初始化渲染
 */

import type { VsCodeApi } from './api';
import { setVsCodeApi } from './dom';
import { initCall, handleHostMessage } from './messaging';
import { renderSidebar } from './render-sidebar';
import { renderToolbar } from './render-commits';
import { renderBranches } from './render-branches';
import { renderCommits } from './render-commits';
import { renderDetail } from './render-detail';
import { renderBottom } from './bottom';
import { loadAll } from './data';

/**
 * 初始化面板
 * 与原 IIFE 的顶层执行等价：注入 api、注册消息监听、首屏渲染并加载数据。
 * 导出为函数以便测试在 jsdom 中直接调用（替代原先 window.eval(PANEL_SCRIPT)）。
 * @param api acquireVsCodeApi 的返回值
 */
export function initPanel(api: VsCodeApi): void {
  setVsCodeApi(api);
  initCall(api);

  // ---- 主进程消息 ----
  window.addEventListener('message', function (event: MessageEvent) {
    const message = event.data;
    handleHostMessage(message);
  });

  // ---- 初始化 ----
  renderSidebar();
  renderToolbar();
  renderBottom();
  renderBranches();
  renderCommits();
  renderDetail();
  void loadAll();
}

// 浏览器（webview）环境：VS Code 注入 acquireVsCodeApi 后立即启动
declare function acquireVsCodeApi(): VsCodeApi;
if (typeof acquireVsCodeApi === 'function') {
  initPanel(acquireVsCodeApi());
}
