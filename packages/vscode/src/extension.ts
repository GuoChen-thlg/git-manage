/**
 * VS Code 插件入口
 * 注册分支/提交两个侧边栏视图与相关命令，并提供打开完整面板的入口。
 *
 * 说明：完整面板（Webview）在后续迭代实现，当前版本先用原生 TreeView 覆盖
 * 分支浏览与切换等高频操作。
 */

import * as vscode from 'vscode';
import { BranchesProvider } from './views/branches-view';
import { CommitsProvider } from './views/commits-view';
import { requireRepository, resolveRepository } from './repository';
import { GitPanelView, setPanelRoot, setPanelStore, focusPanel } from './webview/panel';
import { handleRequest as handlePanelRequest } from './webview/handler';
import { initLogger, info, warn, getLogChannel } from './logger';
import { ensureGitAvailable } from './git-locator';
import {
  checkoutBranchCommand,
  createBranchCommand,
  deleteBranchCommand,
  renameBranchCommand,
} from './commands/branches';

/** 当前仓库根目录缓存，随工作区变化失效 */
let currentRoot: string | null = null;

/**
 * 插件激活
 * @param context 扩展上下文
 */
/**
 * 激活时返回的测试接口
 * 生产环境不依赖此返回值；集成测试用它直接驱动全部功能点
 */
export interface ExtensionTestApi {
  /** 同 webview 请求入口 */
  handleRequest: (method: string, params: Record<string, unknown>, root: string) => Promise<unknown>;
  /** 收藏存储 */
  store: { getFavorites: () => string[]; setFavorites: (names: string[]) => void };
}

export async function activate(context: vscode.ExtensionContext): Promise<ExtensionTestApi> {
  // 日志通道尽早初始化，后续任何失败都能查到
  initLogger({ debug: true });
  const logChannel = getLogChannel();
  if (logChannel) context.subscriptions.push(logChannel);
  info('extension', 'activate', { version: '0.0.1' });

  // GUI 启动的 VS Code 往往找不到用户级安装的 git，先补齐 PATH
  const gitPath = ensureGitAvailable();
  if (!gitPath) {
    void vscode.window.showErrorMessage('未找到 git，请先安装 git 后重试');
  }
  // 注册「显示日志」命令，便于用户与排查者直接打开
  context.subscriptions.push(
    vscode.commands.registerCommand('gitManager.showLogs', () => { logChannel?.show(true); }),
  );

  currentRoot = await resolveRepository();
  info('extension', 'repository_resolved', { root: currentRoot });

  // 收藏分支存在工作区状态里，不写进仓库
  const FAVORITES_KEY = 'gitManager.favorites';
  const store = {
    getFavorites: () => context.workspaceState.get<string[]>(FAVORITES_KEY, []),
    setFavorites: (names: string[]) => { void context.workspaceState.update(FAVORITES_KEY, names); },
  };
  setPanelStore(store);
  setPanelRoot(currentRoot);

  // 完整面板注册为底部面板视图（与问题/输出/终端同区），不是编辑器标签页
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('gitManager.panelView', new GitPanelView(), {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  const branchesProvider = new BranchesProvider(() => currentRoot);
  const commitsProvider = new CommitsProvider(() => currentRoot);

  const commitsView = vscode.window.createTreeView('gitManager.commits', {
    treeDataProvider: commitsProvider,
  });

  context.subscriptions.push(
    vscode.window.createTreeView('gitManager.branches', {
      treeDataProvider: branchesProvider,
      showCollapseAll: false,
    }),
    commitsView,
  );

  /** 刷新两个视图（保留提交列表的分支筛选） */
  const refresh = async (): Promise<void> => {
    currentRoot = await resolveRepository();
    info('extension', 'refresh', { root: currentRoot });
    setPanelRoot(currentRoot);
    branchesProvider.refresh();
    commitsProvider.refresh();
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('gitManager.refresh', refresh),
    // 单击分支只筛选提交列表，不切换工作区分支
    vscode.commands.registerCommand('gitManager.selectBranch', (arg?: unknown) => {
      const name = readBranchName(arg);
      if (!name) return;
      commitsProvider.setBranch(name);
      // 标题标明当前筛选的分支，避免误以为列表是当前分支的
      commitsView.description = name;
    }),
    vscode.commands.registerCommand('gitManager.checkoutBranch', checkoutBranchCommand),
    vscode.commands.registerCommand('gitManager.createBranch', createBranchCommand),
    vscode.commands.registerCommand('gitManager.deleteBranch', deleteBranchCommand),
    vscode.commands.registerCommand('gitManager.renameBranch', renameBranchCommand),
    vscode.commands.registerCommand('gitManager.openPanel', async (commitHash?: unknown) => {
      info('extension', 'open_panel', { commitHash });
      const root = await requireRepository();
      if (!root) {
        warn('extension', 'open_panel_no_repo');
        return;
      }
      currentRoot = root;
      setPanelRoot(root);
      await focusPanel(typeof commitHash === 'string' ? commitHash : undefined);
    }),
    // 供焦点命令转发的提交定位请求
    vscode.commands.registerCommand('gitManager.focusCommit', async (commitHash?: unknown) => {
      void commitHash;
    }),
  );

  // 工作区切换或文件变化时刷新，保证视图与仓库状态一致
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => { void refresh(); }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!editor) return;
      const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
      if (folder && folder.uri.fsPath !== currentRoot) void refresh();
    }),
  );

  // 启动时若当前不在仓库中，给一次明确提示，避免用户面对空视图无从判断
  if (!currentRoot) {
    warn('extension', 'no_repository');
    void vscode.window.showInformationMessage('当前工作区不是 Git 仓库，Git Manager for VS Code 暂时没有可用内容');
  }

  // 暴露请求处理器供集成测试直接驱动全部功能点；
  // 正式使用时不依赖此返回值，导出仅为可测试性
  return {
    handleRequest: (method: string, params: Record<string, unknown>, root: string) =>
      handlePanelRequest(method as never, params as never, root, store),
    store: store,
  };
}

/**
 * 插件停用
 */
export function deactivate(): void {
  info('extension', 'deactivate');
  currentRoot = null;
}

/**
 * 从树节点参数中取出分支名
 * @param arg 命令参数
 * @returns 分支名；无法解析时返回 null
 */
function readBranchName(arg: unknown): string | null {
  if (!arg || typeof arg !== 'object') return null;
  const node = arg as { kind?: string; branch?: { name?: string } };
  if (node.kind !== 'branch' || !node.branch?.name) return null;
  return node.branch.name;
}
