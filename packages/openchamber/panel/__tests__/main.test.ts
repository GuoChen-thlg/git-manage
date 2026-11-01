/**
 * 主入口底部页签单元测试（SDK UI Kit mountTabs 接线）
 * 覆盖：底部页签渲染 Git/控制台/Worktrees 三项、点击切换 activeId、
 * 点击激活的可折叠页签收起回 Git、底部面板随页签显隐、dispose 释放 handle。
 *
 * 说明：main.ts 在模块加载即注册宿主回调并首次渲染，测试通过 mock 宿主/服务
 * 与重型子组件，仅验证底部页签（Kit mountTabs）这一条链路，不触碰业务数据。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/** 捕获的宿主回调句柄（vi.mock 工厂在提升阶段执行，用 vi.hoisted 保存） */
const { hostHooks, toastMock, serviceMock } = vi.hoisted(() => {
  const hostHooks: {
    onReady: ((ctx: unknown) => void) | null;
    onDirectory: ((dir: string) => void) | null;
  } = { onReady: null, onDirectory: null };
  const toastMock = vi.fn().mockResolvedValue(undefined);
  // service mock：覆盖 render/loadData 链路上会调用的方法
  const serviceMock = {
    isGitRepository: vi.fn().mockResolvedValue(true),
    getBranches: vi.fn().mockResolvedValue([]),
    getFavorites: vi.fn().mockResolvedValue([]),
    getLog: vi.fn().mockResolvedValue([]),
    getMyBranches: vi.fn().mockResolvedValue([]),
    debugLog: vi.fn().mockResolvedValue(undefined),
  };
  return { hostHooks, toastMock, serviceMock };
});

// 宿主模块打桩：捕获 onReady/onDirectory 注册，供测试驱动
vi.mock('../host', () => ({
  host: {
    onReady: (cb: (ctx: unknown) => void) => { hostHooks.onReady = cb; },
    onDirectory: (cb: (dir: string) => void) => { hostHooks.onDirectory = cb; },
    toast: toastMock,
  },
}));

// service 模块打桩：返回预置 serviceMock
vi.mock('../service', () => ({
  createServiceClient: () => serviceMock,
}));

// 重型子组件打桩：只保留 dispose 句柄，避免真实渲染分支/提交/详情面板
vi.mock('../components', () => ({
  createBranchPanel: () => ({ dispose: vi.fn(), expandAll: vi.fn(), collapseAll: vi.fn() }),
  createCommitListPanel: () => ({ dispose: vi.fn() }),
  createFileDiffPanel: () => ({ dispose: vi.fn() }),
  createCommitDetailPanel: () => ({ dispose: vi.fn() }),
  createConsolePanel: () => ({ dispose: vi.fn() }),
  createWorktreesPanel: () => ({ dispose: vi.fn() }),
  createSidebar: () => ({ dispose: vi.fn() }),
  hideContextMenu: vi.fn(),
  showCompareBranchesView: vi.fn(),
}));

// 对话框/菜单等直接打桩，避免真实 DOM 与服务调用
vi.mock('../components/dialogs', () => ({ showCreateBranchDialog: vi.fn() }));
vi.mock('../components/settings-menu', () => ({ showSettingsMenu: vi.fn() }));
vi.mock('../components/errors', () => ({ showOperationError: vi.fn() }));
vi.mock('../components/batch-delete', () => ({ deleteBranches: vi.fn(), resolveDeleteTargets: vi.fn() }));
vi.mock('../components/commit-list', () => ({ filterCommits: vi.fn() }));

/** 等待 main.ts 异步 render 完成（loadData → render 链路） */
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('main 底部页签（Kit mountTabs）', () => {
  let root: HTMLDivElement;

  beforeEach(async () => {
    vi.clearAllMocks();
    // 每次用例重建 #root 并重置模块注册表，让 main 模块重新执行 init()、
    // 重置其模块级目录/页签状态，保证用例间相互独立
    document.body.innerHTML = '<div id="root"></div>';
    root = document.getElementById('root') as HTMLDivElement;
    vi.resetModules();
    // 动态 import 触发 init()，随后驱动目录事件进入 render
    await import('../main');
    await flush();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  /** 取底部页签栏（Kit mountTabs 容器） */
  const tabsEl = () => root.querySelector('.oc-sdk-tabs') as HTMLElement;
  /** 取全部页签按钮（Kit .oc-sdk-tab） */
  const tabButtons = () => [...root.querySelectorAll<HTMLButtonElement>('.oc-sdk-tab')];
  /** 取指定 id 的页签按钮 */
  const tabById = (id: string) =>
    tabButtons().find((b) => b.dataset.id === id) as HTMLButtonElement;
  /** 取底部面板容器 */
  const bottomPanel = () => root.querySelector('[data-bottom-panel]') as HTMLElement;

  it('应渲染 Git/控制台/Worktrees 三个 Kit 页签，初始激活 Git', async () => {
    // 驱动目录事件进入 render（目录从 null → /repo）
    hostHooks.onDirectory?.('/repo');
    await flush();

    expect(tabsEl()).toBeTruthy();
    const tabs = tabButtons();
    expect(tabs.map((b) => b.dataset.id)).toEqual(['git', 'console', 'worktrees']);
    expect(tabs.map((b) => b.textContent)).toEqual(['Git', '控制台', 'Worktrees']);
    // 初始 Git 激活
    expect(tabById('git').getAttribute('aria-selected')).toBe('true');
    expect(tabById('console').getAttribute('aria-selected')).toBe('false');
  });

  it('点击页签应切换 activeId 并显示对应底部面板', async () => {
    hostHooks.onDirectory?.('/repo');
    await flush();

    // 切到控制台：activeId=console，底部面板显示
    tabById('console').click();
    await flush();
    expect(tabById('console').getAttribute('aria-selected')).toBe('true');
    expect(tabById('git').getAttribute('aria-selected')).toBe('false');
    expect(bottomPanel().style.display).toBe('block');

    // 切到 Worktrees
    tabById('worktrees').click();
    await flush();
    expect(tabById('worktrees').getAttribute('aria-selected')).toBe('true');
    expect(bottomPanel().style.display).toBe('block');
  });

  it('点击 Git 页签应收起底部面板（收起入口），控制台/Worktrees 切换均显示', async () => {
    hostHooks.onDirectory?.('/repo');
    await flush();

    // 打开控制台
    tabById('console').click();
    await flush();
    expect(tabById('console').getAttribute('aria-selected')).toBe('true');
    expect(bottomPanel().style.display).toBe('block');

    // 切到 Worktrees 仍显示
    tabById('worktrees').click();
    await flush();
    expect(tabById('worktrees').getAttribute('aria-selected')).toBe('true');
    expect(bottomPanel().style.display).toBe('block');

    // 点击 Git 页签 → 收起底部面板
    tabById('git').click();
    await flush();
    expect(tabById('git').getAttribute('aria-selected')).toBe('true');
    expect(tabById('worktrees').getAttribute('aria-selected')).toBe('false');
    expect(bottomPanel().style.display).toBe('none');
  });
});
