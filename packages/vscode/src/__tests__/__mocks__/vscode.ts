/**
 * vscode 模块测试替身
 * 插件代码依赖 vscode 提供的编辑器 API，测试环境没有真实宿主，
 * 这里提供最小可用替身：TreeItem / ThemeIcon / EventEmitter / 各类 window 交互，
 * 并暴露断言用的记录字段。
 */

import { vi } from 'vitest';

/** 树节点折叠状态 */
export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

/** 树节点 */
export class TreeItem {
  /** 展示文案 */
  label: string;

  /** 折叠状态 */
  collapsibleState: TreeItemCollapsibleState;

  /** 右键菜单匹配用的上下文值 */
  contextValue?: string;

  /** 次要描述文案 */
  description?: string;

  /** 悬停提示 */
  tooltip?: string;

  /** 图标 */
  iconPath?: unknown;

  /** 点击时执行的命令 */
  command?: { command: string; title: string; arguments?: unknown[] };

  constructor(label: string, collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.None) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

/** 主题图标 */
export class ThemeIcon {
  /** 图标 id，如 git-branch */
  id: string;

  constructor(id: string) {
    this.id = id;
  }
}

/** 事件发射器 */
export class EventEmitter<T> {
  /** 已注册的监听函数，测试可直接触发 */
  private listeners: Array<(e: T) => void> = [];

  /** 注册监听 */
  readonly event = (listener: (e: T) => void): { dispose: () => void } => {
    this.listeners.push(listener);
    return { dispose: () => { this.listeners = this.listeners.filter(l => l !== listener); } };
  };

  /** 触发事件 */
  fire(data: T): void {
    for (const l of this.listeners) l(data);
  }

  /** 释放 */
  dispose(): void {
    this.listeners = [];
  }
}

/** 编辑器列位 */
export enum ViewColumn {
  Active = -1,
  One = 1,
  Two = 2,
  Three = 3,
}

/** 记录创建的 webview 面板，供断言 */
export const createdPanels: Array<{
  viewType: string;
  title: string;
  html: string;
  postedMessages: unknown[];
  disposed: boolean;
}> = [];

/** 记录注册的 WebviewView 提供者 */
export const registeredViewProviders = new Map<string, { resolveWebviewView: (v: unknown) => void }>();

/**
 * 创建 WebviewView 替身，用于测试底部面板视图
 * @returns 视图对象与记录
 */
export function createWebviewView() {
  const record = {
    html: '',
    postedMessages: [] as unknown[],
    visible: true,
    disposed: false,
  };

  const webview = {
    options: {} as unknown,
    get html(): string { return record.html; },
    set html(value: string) { record.html = value; },
    postMessage: vi.fn(async (message: unknown) => {
      record.postedMessages.push(message);
      return true;
    }),
    onDidReceiveMessage: vi.fn((_handler: (message: unknown) => void) => ({ dispose: vi.fn() })),
  };

  const view = {
    webview,
    visible: record.visible,
    onDidChangeVisibility: vi.fn(() => ({ dispose: vi.fn() })),
    dispose: vi.fn(() => { record.disposed = true; }),
  };

  return { view, record };
}

/**
 * 创建 webview 面板替身
 * @param viewType 视图类型
 * @param title 标题
 * @returns 面板对象
 */
export function createWebviewPanel(viewType: string, title: string) {
  const record = {
    viewType,
    title,
    html: '',
    postedMessages: [] as unknown[],
    disposed: false,
  };
  createdPanels.push(record);

  const webview = {
    get html(): string { return record.html; },
    set html(value: string) { record.html = value; },
    postMessage: vi.fn(async (message: unknown) => {
      record.postedMessages.push(message);
      return true;
    }),
    onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
  };

  return {
    webview,
    reveal: vi.fn(),
    onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    dispose: vi.fn(() => { record.disposed = true; }),
  };
}

/** 清空创建的 webview 面板记录 */
export function resetPanels(): void {
  createdPanels.length = 0;
  registeredViewProviders.clear();
}

/** 窗口交互的调用记录 */
export const windowCalls = {
  /** showInputBox 的调用参数 */
  inputBox: [] as unknown[],
  /** showQuickPick 的调用参数 */
  quickPick: [] as unknown[],
  /** showInformationMessage 的消息文本 */
  info: [] as string[],
  /** showWarningMessage 的消息文本 */
  warn: [] as string[],
  /** showErrorMessage 的消息文本 */
  error: [] as string[],
};

/** 可被用例覆盖的返回值 */
export const windowStubs = {
  /** showInputBox 返回值 */
  inputBoxResult: null as string | undefined | null,
  /** showQuickPick 返回值 */
  quickPickResult: null as unknown,
  /** showWarningMessage 的模态返回值 */
  warningModalResult: undefined as string | undefined,
};

/** 清空所有调用记录与桩值 */
export function resetWindowCalls(): void {
  windowCalls.inputBox.length = 0;
  windowCalls.quickPick.length = 0;
  windowCalls.info.length = 0;
  windowCalls.warn.length = 0;
  windowCalls.error.length = 0;
  windowStubs.inputBoxResult = null;
  windowStubs.quickPickResult = null;
  windowStubs.warningModalResult = undefined;
}

/** 命令注册记录 */
export const registeredCommands = new Map<string, (...args: unknown[]) => unknown>();

/** 窗口 API 替身 */
export const window = {
  showInputBox: vi.fn(async (options: unknown) => {
    windowCalls.inputBox.push(options);
    return windowStubs.inputBoxResult ?? undefined;
  }),
  showQuickPick: vi.fn(async (items: unknown, options: unknown) => {
    windowCalls.quickPick.push({ items, options });
    return windowStubs.quickPickResult ?? undefined;
  }),
  showInformationMessage: vi.fn(async (message: string) => {
    windowCalls.info.push(message);
    return undefined;
  }),
  showWarningMessage: vi.fn(async (message: string) => {
    windowCalls.warn.push(message);
    return windowStubs.warningModalResult;
  }),
  showErrorMessage: vi.fn(async (message: string) => {
    windowCalls.error.push(message);
    return undefined;
  }),
  createTreeView: vi.fn((_viewId: string, _options: unknown) => ({ dispose: vi.fn() })),
  // 输出通道：记录写入的行，便于测试断言日志内容
  createOutputChannel: vi.fn((_name: string) => ({
    appendLine: vi.fn(),
    append: vi.fn(),
    show: vi.fn(),
    dispose: vi.fn(),
    clear: vi.fn(),
  })),
  createWebviewPanel: vi.fn((viewType: string, title: string) => createWebviewPanel(viewType, title)),
  registerWebviewViewProvider: vi.fn((viewId: string, provider: { resolveWebviewView: (v: unknown) => void }) => {
    registeredViewProviders.set(viewId, provider);
    return { dispose: vi.fn() };
  }),
  activeTextEditor: undefined as unknown,
  onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
};

/** 工作区替身 */
export const workspace = {
  workspaceFolders: [] as Array<{ uri: { fsPath: string } }>,
  getWorkspaceFolder: vi.fn(() => undefined),
  onDidChangeWorkspaceFolders: vi.fn(() => ({ dispose: vi.fn() })),
};

/** 命令 API 替身 */
export const commands = {
  registerCommand: vi.fn((id: string, handler: (...args: unknown[]) => unknown) => {
    registeredCommands.set(id, handler);
    return { dispose: vi.fn() };
  }),
  executeCommand: vi.fn(async () => undefined),
};

/** 清空已注册命令 */
export function resetCommands(): void {
  registeredCommands.clear();
}
