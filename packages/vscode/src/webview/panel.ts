/**
 * 完整面板（WebviewView）
 * 呈现于 VS Code 底部面板区（与「问题」「输出」「终端」同排），而不是编辑器标签页。
 *
 * 之所以用 WebviewView 而非 createWebviewPanel：后者的 ViewColumn 只能定位编辑器列，
 * 无法放入底部面板。
 *
 * 通信：webview 每次操作发一条 request，主进程处理后回 response。
 * 资源加载：脚本与样式由 esbuild 产物（dist/webview/main.js / main.css）外链提供，
 * 图标与初始哈希仍以小段内联脚本注入（nonce 允许）。
 */

import * as vscode from 'vscode';
import { handleRequest } from './handler';
import type { WebviewStore } from './handler';
import { PANEL_ICONS } from './icons';
import type { ExtensionResponse, WebviewRequest } from './protocol';
import { debug, error as logError, info } from '../logger';

/** 面板标题 */
const PANEL_TITLE = 'Git Manager for VS Code';

/** 当前绑定的仓库根目录，供 provider 读取 */
let currentRoot: string | null = null;

/** 面板本地存储，由扩展激活时注入 */
let store: WebviewStore = {
  getFavorites: () => [],
  setFavorites: () => {},
  getDiffWrap: () => false,
  setDiffWrap: () => {},
};

/**
 * 设置面板使用的仓库根目录
 * @param root 仓库根目录
 */
export function setPanelRoot(root: string | null): void {
  currentRoot = root;
  GitPanelView.instance?.notifyRepositoryChanged(root);
}

/**
 * 注入本地存储
 * @param value 存储实现
 */
export function setPanelStore(value: WebviewStore): void {
  store = value;
}

/**
 * 底部面板的 WebviewView 提供者
 */
export class GitPanelView implements vscode.WebviewViewProvider {
  /** 当前实例，用于外部触发刷新 */
  private static current: GitPanelView | undefined;

  /** 提供者实例（静态引用，便于命令聚焦视图） */
  static get instance(): GitPanelView | undefined {
    return GitPanelView.current;
  }

  /** 宿主提供的视图对象 */
  private view: vscode.WebviewView | undefined;

  /** 视图是否已解析完成 */
  private ready = false;

  /**
   * 解析 WebviewView（视图首次显示时调用）
   * @param webviewView 视图对象
   */
  resolveWebviewView(webviewView: vscode.WebviewView): void {
    GitPanelView.current = this;
    this.view = webviewView;
    this.ready = true;
    info('panel', 'resolve_view');

    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = buildHtml(undefined, webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      (message: WebviewRequest) => { void this.onMessage(message); },
      undefined,
    );

    // 视图重新可见时刷新，保证数据与仓库状态一致
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) void this.notifyRepositoryChanged(currentRoot);
    });
  }

  /**
   * 通知面板仓库已变更（触发重新加载）
   * @param root 仓库根目录
   */
  notifyRepositoryChanged(root: string | null): void {
    if (!this.ready || !this.view) return;
    // 视图尚未显示时无需推送，显示时会自行加载
    if (!this.view.visible) return;
    void this.view.webview.postMessage({ type: 'event', name: 'repositoryChanged', payload: root });
  }

  /**
   * 处理 webview 请求
   * @param message 消息
   */
  private async onMessage(message: WebviewRequest): Promise<void> {
    if (!message) return;

    // webview 内日志转发：保证前端行为也能在主进程日志中看到
    if ((message as unknown as { type: string }).type === 'log') {
      const payload = message as unknown as { level: string; prefix: string; message: string; data?: unknown };
      const level = payload.level === 'error' ? 'error' : payload.level === 'warn' ? 'warn' : 'debug';
      if (level === 'error') logError(payload.prefix, payload.message, payload.data);
      else debug(payload.prefix, payload.message, payload.data);
      return;
    }

    if (message.type !== 'request') return;
    if (!this.view) {
      logError('panel', 'message_without_view', { method: message.method });
      return;
    }

    let response: ExtensionResponse;
    try {
      if (!currentRoot) throw new Error('当前工作区不是 Git 仓库');
      const data = await handleRequest(message.method, message.params ?? {}, currentRoot, store);
      response = { type: 'response', id: message.id, ok: true, data: data ?? null };
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      logError('panel', 'request_failed', { method: message.method, error: text });
      response = { type: 'response', id: message.id, ok: false, error: text };
    }
    void this.view.webview.postMessage(response);
  }
}

/**
 * 聚焦底部面板中的 Git Manager for VS Code 视图
 * @param commitHash 可选：定位的提交
 */
export async function focusPanel(commitHash?: string): Promise<void> {
  try {
    // 先让面板区显示该视图，再聚焦
    await vscode.commands.executeCommand('gitManager.panelView.focus');
    const view = GitPanelView.instance;
    if (view && commitHash) {
      await vscode.commands.executeCommand('gitManager.focusCommit', commitHash);
    }
  } catch (err) {
    void vscode.window.showErrorMessage(
      `无法打开 Git Manager for VS Code 面板：${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * 构造 webview 页面
 * @param initialHash 可选：初始定位的提交
 * @param webview 可选：宿主 webview 对象；传入时脚本与样式以 asWebviewUri 外链引用，
 *                不传（测试等场景）回退为产物相对路径占位
 * @returns HTML 文本
 */
function buildHtml(initialHash?: string, webview?: vscode.Webview): string {
  const nonce = createNonce();
  const initial = JSON.stringify(initialHash ?? null);
  // 图标以 JSON 注入，避免在脚本里重复拼接 SVG 字符串
  const iconsJson = JSON.stringify(PANEL_ICONS).replace(/</g, '\\u003c');

  // 外链资源 URI：有 webview 时转为 webview 可访问的 https URI
  const extUri = vscode.extensions?.getExtension('thlg.git-manager-vscode')?.extensionUri
    ?? vscode.Uri.file('/');
  const scriptSrc = webview
    ? webview.asWebviewUri(vscode.Uri.joinPath(extUri, 'dist', 'webview', 'main.js')).toString()
    : 'dist/webview/main.js';
  const cssSrc = webview
    ? webview.asWebviewUri(vscode.Uri.joinPath(extUri, 'dist', 'webview', 'main.css')).toString()
    : 'dist/webview/main.css';

  // 内容安全策略：脚本仅允许带 nonce 的内联脚本与 webview 资源来源
  const cspSource = webview ? ` ${webview.cspSource}` : '';
  const csp = [
    "default-src 'none'",
    `style-src 'unsafe-inline'${cspSource}`,
    `script-src 'nonce-${nonce}'${cspSource}`,
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<title>${PANEL_TITLE}</title>
<link rel="stylesheet" href="${cssSrc}" />
</head>
<body>
<div id="app">
  <div id="content">
    <div id="sidebar"></div>
    <div id="branches"></div>
    <div id="center">
      <div id="toolbar"></div>
      <div id="commits"></div>
    </div>
    <div id="detail"></div>
  </div>
  <div id="bottom"></div>
</div>
<script nonce="${nonce}">window.__ICONS__ = ${iconsJson};</script>
<script nonce="${nonce}">window.__INITIAL_HASH__ = ${initial};</script>
<script nonce="${nonce}" src="${scriptSrc}"></script>
</body>
</html>`;
}

/**
 * 生成随机 nonce
 * @returns nonce 字符串
 */
function createNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i += 1) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

export { buildHtml };
