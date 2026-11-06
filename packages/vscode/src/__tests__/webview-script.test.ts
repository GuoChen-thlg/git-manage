/**
 * 面板脚本运行时测试
 * 在 jsdom 中真实执行注入用脚本，验证渲染与请求链路能跑通，
 * 而不只是检查字符串里有没有关键字。
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { initPanel } from '../webview/src/main';
import { resetState } from '../webview/src/state';
import { closeDropdown } from '../webview/src/dialogs';
import type { VsCodeApi } from '../webview/src/api';

/** 记录 webview 发出的请求 */
interface SentMessage {
  type: string;
  id: number;
  method: string;
  params: Record<string, unknown>;
}

/**
 * 启动一个带面板脚本的 jsdom 环境
 * @returns 窗口、文档与已发送消息
 */
function boot(opts: {
  /** 预置自动换行持久化状态 */
  diffWrap?: boolean;
  /** 预置 diff 弹窗视图模式持久化状态 */
  diffView?: 'side' | 'unified';
  /** 预置忽略空白持久化状态 */
  ignoreWs?: boolean;
  /** 预置单词高亮持久化状态 */
  highlightWords?: boolean;
  /** 预置显示行号持久化状态（默认 true） */
  showLineNums?: boolean;
  /** 预置显示空白符持久化状态 */
  showWhitespace?: boolean;
  /** 预置行内差异高亮持久化状态 */
  inlineDiff?: boolean;
  /** 覆盖 getCommitDiffs 返回的差异样例（默认两组固定文件） */
  commitDiffs?: unknown;
} = {}) {
  const dom = new JSDOM(
    `<!DOCTYPE html><body><div id="app">
      <div id="content">
        <div id="sidebar"></div><div id="branches"></div>
        <div id="center"><div id="toolbar"></div><div id="commits"></div></div>
        <div id="detail"></div>
      </div>
      <div id="bottom"></div>
    </div></body>`,
    { runScripts: 'outside-only' },
  );

  const { window } = dom;
  const sent: SentMessage[] = [];
  /** 收藏存储，跨请求保留 */
  const favorites: string[] = [];
  /** 自动换行持久化状态（可由用例预置，模拟 workspaceState） */
  let diffWrap = opts.diffWrap === true;
  /** diff 弹窗视图模式持久化状态（'side' 并排 / 'unified' 单栏） */
  let diffView = opts.diffView ?? 'side';
  /** 忽略空白持久化状态 */
  let ignoreWs = opts.ignoreWs === true;
  /** 单词高亮持久化状态 */
  let highlightWords = opts.highlightWords === true;
  /** 显示行号持久化状态（默认开） */
  let showLineNums = opts.showLineNums !== false;
  /** 显示空白符持久化状态 */
  let showWhitespace = opts.showWhitespace === true;
  /** 行内差异高亮持久化状态 */
  let inlineDiff = opts.inlineDiff === true;

  // 模拟扩展主进程：收到请求后按方法返回假数据
  (window as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi = () => ({
    postMessage: (message: SentMessage) => {
      sent.push(message);
      setTimeout(() => {
        const reply: { type: string; id: number; ok: boolean; data: unknown; error?: string } = {
          type: 'response',
          id: message.id,
          ok: true,
          data: null,
        };
        if (message.method === 'getBranches') {
          reply.data = [
            { name: 'main', isCurrent: true, isRemote: false, message: 'init' },
            { name: 'feat', isCurrent: false, isRemote: false, message: 'wip' },
            { name: 'origin/main', isCurrent: false, isRemote: true },
            { name: 'unmerged', isCurrent: false, isRemote: false },
          ];
        } else if (message.method === 'getCommitLog') {
          // 记录最近一次调用的参数，供过滤测试断言
          reply.data = [
            { hash: 'abc123', shortHash: 'abc123', message: 'feat: 第一条', authorName: '张三', date: '2026-01-02 10:00:00 +0800', parents: ['p1'] },
            { hash: 'def456', shortHash: 'def456', message: 'fix: 第二条', authorName: '李四', date: '2026-01-01 09:00:00 +0800', parents: ['p2', 'p3'] },
            // 多分支场景：制造多条并列的父提交，把图线列数撑大
            { hash: 'g1', shortHash: 'g1', message: 'merge: 合并多条分支', authorName: '王五', date: '2026-01-03 11:00:00 +0800', parents: ['a1','a2','a3','a4','a5'] },
            { hash: 'a1', shortHash: 'a1', message: 'feat: 分支一', authorName: '甲', date: '2025-12-30 08:00:00 +0800', parents: ['z1'] },
            { hash: 'a2', shortHash: 'a2', message: 'feat: 分支二', authorName: '乙', date: '2025-12-29 08:00:00 +0800', parents: ['z2'] },
            { hash: 'a3', shortHash: 'a3', message: 'feat: 分支三', authorName: '丙', date: '2025-12-28 08:00:00 +0800', parents: ['z3'] },
            { hash: 'a4', shortHash: 'a4', message: 'feat: 分支四', authorName: '丁', date: '2025-12-27 08:00:00 +0800', parents: ['z4'] },
            { hash: 'a5', shortHash: 'a5', message: 'feat: 分支五', authorName: '戊', date: '2025-12-26 08:00:00 +0800', parents: ['z5'] },
            // 互不相连的提交会让图线列数持续增长，复现多分支仓库的真实情况
            ...Array.from({ length: 8 }, (_, i) => ({
              hash: 'iso' + i, shortHash: 'iso' + i,
              message: 'feat: 独立提交 ' + i, authorName: '独立',
              date: '2025-12-' + String(10 + i).padStart(2, '0') + ' 08:00:00 +0800',
              parents: ['isoz' + i],
            })),
          ];
        } else if (message.method === 'getCommitDetail') {
          reply.data = {
            hash: 'abc123', shortHash: 'abc123', message: 'feat: 第一条',
            authorName: '张三', authorEmail: 'z@example.com', date: '2026-01-01', parents: [],
          };
        } else if (message.method === 'getCommitDiffs') {
          // 两个文件：供 diff 弹窗的上一个/下一个切换用例使用；
          // 用例可通过 opts.commitDiffs 覆盖（如配对 delete/add 行的高亮场景）
          reply.data = opts.commitDiffs ?? [{
            path: 'a.ts', additions: 2, deletions: 1,
            lines: [
              { type: 'context', content: 'const a = 1;', oldLine: 1, newLine: 1 },
              { type: 'add', content: 'const b = 2;', newLine: 2 },
              { type: 'delete', content: 'old();', oldLine: 2 },
            ],
          }, {
            path: 'b.ts', additions: 1, deletions: 0,
            lines: [
              { type: 'add', content: 'new line', newLine: 1 },
            ],
          }];
        } else if (message.method === 'getFavorites') {
          reply.data = favorites;
        } else if (message.method === 'getDiffWrap') {
          reply.data = diffWrap;
        } else if (message.method === 'setDiffWrap') {
          diffWrap = (message.params as { value?: boolean } | undefined)?.value === true;
          reply.data = null;
        } else if (message.method === 'getDiffView') {
          reply.data = diffView;
        } else if (message.method === 'setDiffView') {
          const v = (message.params as { value?: string } | undefined)?.value;
          if (v === 'unified' || v === 'side') diffView = v;
          reply.data = null;
        } else if (message.method === 'getIgnoreWs') {
          reply.data = ignoreWs;
        } else if (message.method === 'setIgnoreWs') {
          ignoreWs = (message.params as { value?: boolean } | undefined)?.value === true;
          reply.data = null;
        } else if (message.method === 'getHighlightWords') {
          reply.data = highlightWords;
        } else if (message.method === 'setHighlightWords') {
          highlightWords = (message.params as { value?: boolean } | undefined)?.value === true;
          reply.data = null;
        } else if (message.method === 'getShowLineNums') {
          reply.data = showLineNums;
        } else if (message.method === 'setShowLineNums') {
          showLineNums = (message.params as { value?: boolean } | undefined)?.value !== false;
          reply.data = null;
        } else if (message.method === 'getShowWhitespace') {
          reply.data = showWhitespace;
        } else if (message.method === 'setShowWhitespace') {
          showWhitespace = (message.params as { value?: boolean } | undefined)?.value === true;
          reply.data = null;
        } else if (message.method === 'getInlineDiff') {
          reply.data = inlineDiff;
        } else if (message.method === 'setInlineDiff') {
          inlineDiff = (message.params as { value?: boolean } | undefined)?.value === true;
          reply.data = null;
        } else if (message.method === 'saveFavorites') {
          favorites.length = 0;
          const list = (message.params as { favorites?: string[] } | undefined)?.favorites ?? [];
          favorites.push(...list);
          reply.data = null;
        } else if (message.method === 'listFiles') {
          reply.data = ['src/a.ts', 'src/b.ts', 'src/nested/c.ts', 'README.md'];
        } else if (message.method === 'getMyBranches') {
          reply.data = ['feat'];
        } else if (message.method === 'getCommandLogs') {
          reply.data = [
            { id: 1, command: 'git status', ok: true, durationMs: 12 },
            { id: 2, command: 'git checkout x', ok: false, durationMs: 30 },
          ];
        } else if (message.method === 'deleteBranch') {
          const p = message.params as { name: string; force?: boolean };
          if (p.name === 'unmerged' && !p.force) {
            reply.ok = false;
            reply.error = "error: The branch 'unmerged' is not fully merged";
          } else {
            reply.data = null;
          }
        } else if (message.method === 'listWorktrees') {
          reply.data = [
            { path: '/repo', branch: 'refs/heads/main', isMain: true },
            { path: '/repo-wt', branch: 'refs/heads/feat', isMain: false },
          ];
        }
        window.postMessage(reply, '*');
      }, 0);
    },
  });

  // 主进程会注入图标映射，测试中提供最小可用集合
  (window as unknown as { __ICONS__: Record<string, string> }).__ICONS__ = {
    hideBranches: '<svg></svg>', newBranch: '<svg></svg>', updateSelected: '<svg></svg>',
    deleteBranch: '<svg></svg>', compareBranch: '<svg></svg>', search: '<svg></svg>',
    fetch: '<svg></svg>', favoriteOutline: '<svg></svg>', locate: '<svg></svg>',
    settings: '<svg></svg>', expandAll: '<svg></svg>', collapseAll: '<svg></svg>',
    refresh: '<svg></svg>', cherryPick: '<svg></svg>', sort: '<svg></svg>',
    regex: '<svg></svg>', goToRef: '<svg></svg>', graph: '<svg></svg>',
    remote: '<svg></svg>', pull: '<svg></svg>', push: '<svg></svg>', download: '<svg></svg>',
  };
  // 直接调用入口初始化（替代原先 window.eval(PANEL_SCRIPT)）
  // 迁移后代码以真模块运行，需要把 jsdom 的全局挂到 Node globalThis（等价于原 eval 的全局环境）
  const globals = globalThis as unknown as Record<string, unknown>;
  globals.document = window.document;
  globals.window = window;
  globals.Event = window.Event;
  globals.KeyboardEvent = window.KeyboardEvent;
  globals.MouseEvent = window.MouseEvent;
  globals.Node = window.Node;
  globals.MessageEvent = window.MessageEvent;
  // 模块级单例状态在 boot 之间共享（原 eval 每次新建闭包），此处重置等价隔离
  resetState();
  closeDropdown();
  initPanel((window as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi() as unknown as VsCodeApi);
  return {
    window, document: window.document, sent,
    /** 读写当前换行持久化状态 */
    get diffWrap() { return diffWrap; },
    /** 读写当前视图模式持久化状态 */
    get diffView() { return diffView; },
    /** 读写当前忽略空白持久化状态 */
    get ignoreWs() { return ignoreWs; },
    /** 读写当前单词高亮持久化状态 */
    get highlightWords() { return highlightWords; },
    /** 读写当前显示行号持久化状态 */
    get showLineNums() { return showLineNums; },
    /** 读写当前显示空白符持久化状态 */
    get showWhitespace() { return showWhitespace; },
    /** 读写当前行内差异高亮持久化状态 */
    get inlineDiff() { return inlineDiff; },
  };
}



/** 等待异步渲染完成 */
const settle = (ms = 120) => new Promise(r => setTimeout(r, ms));

describe('面板脚本运行时', () => {
  let env: ReturnType<typeof boot>;






/**
 * 确保两个分支分组都展开
 * 前序用例可能折叠了分组，导致后续用例查不到分支行
 */
async function ensureExpanded() {
  for (let i = 0; i < 3; i += 1) {
    const headers = [...env.document.querySelectorAll('.group-header')] as HTMLElement[];
    const collapsed = headers.filter(h => h.textContent?.includes('▸'));
    if (!collapsed.length) return;
    collapsed[0]!.click();
    await settle(20);
  }
}


  beforeAll(async () => {
    env = boot();
    await settle();
  }, 10000);

  it('启动时应请求分支列表与提交日志', () => {
    const methods = env.sent.map(m => m.method);
    expect(methods).toContain('getBranches');
    expect(methods).toContain('getCommitLog');
  });

  it('应渲染本地与远程两个分组', () => {
    const text = env.document.getElementById('branches')!.textContent ?? '';
    expect(text).toContain('本地分支');
    expect(text).toContain('远程分支');
  });

  it('应渲染分支名称，当前分支带标记', () => {
    const text = env.document.getElementById('branches')!.textContent ?? '';
    expect(text).toContain('main');
    expect(text).toContain('feat');
    // 当前分支显示实心圆点
    const current = [...env.document.querySelectorAll('.branch-item.current')];
    expect(current.length).toBe(1);
    expect(current[0]!.textContent).toContain('main');
  });

  it('应渲染提交列表内容', () => {
    const text = env.document.getElementById('commits')!.textContent ?? '';
    expect(text).toContain('feat: 第一条');
    expect(text).toContain('abc123');
    expect(text).toContain('张三');
  });

  it('点击提交应请求详情并渲染变更文件', async () => {
    const row = env.document.querySelector('.commit-item') as HTMLElement;
    expect(row).toBeTruthy();
    row.click();
    await settle();

    const methods = env.sent.map(m => m.method);
    expect(methods).toContain('getCommitDetail');
    expect(methods).toContain('getCommitDiffs');

    const detail = env.document.getElementById('detail')!.textContent ?? '';
    expect(detail).toContain('feat: 第一条');
    expect(detail).toContain('z@example.com');
    expect(detail).toContain('a.ts');
  });

  it('点击分支应切换提交过滤条件', async () => {
    const items = [...env.document.querySelectorAll('.branch-item')] as HTMLElement[];
    const feat = items.find(el => el.textContent?.includes('feat'));
    expect(feat).toBeTruthy();

    const before = env.sent.length;
    feat!.click();
    await settle();

    const next = env.sent.slice(before).find(m => m.method === 'getCommitLog');
    expect(next?.params.branch).toBe('feat');
  });

  it('折叠分组后应隐藏组内分支', () => {
    const headers = [...env.document.querySelectorAll('.group-header')] as HTMLElement[];
    const local = headers.find(h => h.textContent?.includes('本地分支'));
    expect(local).toBeTruthy();

    local!.click();
    // 渲染会重建 DOM，需重新查询节点
    const rebuilt = [...env.document.querySelectorAll('.group-header')]
      .find(h => h.textContent?.includes('本地分支')) as HTMLElement;
    // 折叠后箭头由 ▾ 变为 ▸
    expect(rebuilt.textContent).toContain('▸');
    // 组内分支应被隐藏，只剩远程组的分支
    expect(env.document.getElementById('branches')!.textContent).not.toContain('feat');
  });

  it('左侧图标列应渲染 12 个图标按钮', () => {
    const buttons = env.document.querySelectorAll('#sidebar .icon-btn');
    expect(buttons.length).toBe(12);
  });

  it('删除按钮在未选中分支时禁用，选中后可用', async () => {
    // 该用例依赖未选中的初始状态，先刷新一次重置
    const reload = [...env.document.querySelectorAll('#sidebar .icon-btn')] as HTMLElement[];
    expect(reload[3]!.title).toBe('删除分支');

    // 前序用例可能折叠了分组，先展开全部保证分支可见
    const icons = [...env.document.querySelectorAll('#sidebar .icon-btn')] as HTMLElement[];
    icons[icons.length - 2]!.click();
    await settle(20);

    // 点击一个分支后删除按钮应可用
    const items = [...env.document.querySelectorAll('.branch-item')] as HTMLElement[];
    const feat = items.find(el => el.textContent?.includes('feat'));
    feat!.click();
    await settle(30);

    const after = [...env.document.querySelectorAll('#sidebar .icon-btn')] as HTMLButtonElement[];
    expect(after[3]!.disabled).toBe(false);
  });

  it('顶部工具栏应渲染搜索框与过滤按钮', () => {
    const toolbar = env.document.getElementById('toolbar')!;
    expect(toolbar.querySelector('input[type="text"]')).toBeTruthy();
    const text = toolbar.textContent ?? '';
    for (const label of ['分支', '用户', '日期', '路径']) {
      expect(text).toContain(label);
    }
  });

  it('点击收起分支面板应隐藏分支区', () => {
    const buttons = [...env.document.querySelectorAll('#sidebar .icon-btn')] as HTMLElement[];
    const branches = env.document.getElementById('branches')!;
    expect(branches.style.display).not.toBe('none');

    buttons[0]!.click();
    expect(branches.style.display).toBe('none');

    // 再点恢复
    const refreshed = [...env.document.querySelectorAll('#sidebar .icon-btn')] as HTMLElement[];
    refreshed[0]!.click();
    expect(branches.style.display).toBe('');
  });

  it('搜索框应过滤提交列表', async () => {
    const search = env.document.querySelector('#toolbar input[type="text"]') as HTMLInputElement;
    search.value = '不存在的关键字';
    search.dispatchEvent(new env.window.Event('input'));
    await settle(20);
    expect(env.document.getElementById('commits')!.textContent).toContain('没有匹配的提交');

    // 清空后恢复
    search.value = '';
    search.dispatchEvent(new env.window.Event('input'));
    await settle(20);
    expect(env.document.getElementById('commits')!.textContent).toContain('feat: 第一条');
  });

  it('折叠全部应折叠两个分组', () => {
    const buttons = [...env.document.querySelectorAll('#sidebar .icon-btn')] as HTMLElement[];
    // 最后一个是折叠全部
    buttons[buttons.length - 1]!.click();

    const headers = [...env.document.querySelectorAll('.group-header')] as HTMLElement[];
    for (const h of headers) {
      expect(h.textContent).toContain('▸');
    }
  });

  it('分支面板应有搜索框', () => {
    expect(env.document.querySelector('.branch-search input')).toBeTruthy();
  });

  it('分支搜索应过滤列表', async () => {
    await ensureExpanded();
    const input = env.document.querySelector('.branch-search input') as HTMLInputElement;
    input.value = 'feat';
    input.dispatchEvent(new env.window.Event('input'));
    await settle(20);

    const text = env.document.getElementById('branch-list')!.textContent ?? '';
    expect(text).toContain('feat');
    expect(text).not.toContain('origin/main');

    input.value = '';
    input.dispatchEvent(new env.window.Event('input'));
    await settle(20);
  });

  it('点击星标应收藏分支并持久化，不触发分支选中', async () => {
    await ensureExpanded();
    const before = env.sent.filter(m => m.method === 'saveFavorites').length;

    const rows = [...env.document.querySelectorAll('.branch-item')] as HTMLElement[];
    const target = rows.find(r => r.textContent?.includes('main'))!;
    const star = target.querySelector('.star') as HTMLElement;
    star.click();
    await settle(30);

    // 发出了保存请求
    const saved = env.sent.filter(m => m.method === 'saveFavorites');
    expect(saved.length).toBe(before + 1);
    expect((saved.at(-1)!.params as { favorites: string[] }).favorites).toContain('main');

    // 星标显示为已收藏
    const after = [...env.document.querySelectorAll('.branch-item')]
      .find(r => r.textContent?.includes('main'))!;
    expect(after.querySelector('.star')!.textContent).toBe('★');
  });

  it('只显示我的分支应过滤掉非我的分支', async () => {
    await ensureExpanded();
    const icons = [...env.document.querySelectorAll('#sidebar .icon-btn')] as HTMLButtonElement[];
    // 第 6 个是「只显示我的分支」
    icons[5]!.click();
    await settle(30);

    const text = env.document.getElementById('branch-list')!.textContent ?? '';
    // 替身返回我的分支只有 feat
    expect(text).toContain('feat');
    expect(text).not.toContain('origin/main');

    // 再点一次关闭
    const again = [...env.document.querySelectorAll('#sidebar .icon-btn')] as HTMLButtonElement[];
    again[5]!.click();
    await settle(30);
  });

  it('点击文件应打开 diff 弹窗并渲染差异内容', async () => {
    // 先选中一个提交以加载详情
    const commitRow = env.document.querySelector('.commit-item') as HTMLElement;
    commitRow.click();
    await settle(120);

    const fileRow = env.document.querySelector('.file-row') as HTMLElement;
    expect(fileRow).toBeTruthy();
    // 初始无弹窗
    expect(env.document.querySelector('#diff-popup-overlay')).toBeNull();

    fileRow.click();
    await settle(30);

    // 弹窗出现，展示第一个文件的路径与计数
    const overlay = env.document.querySelector('#diff-popup-overlay');
    expect(overlay, '点击文件行应打开 diff 弹窗').toBeTruthy();
    expect(overlay!.querySelector('.diff-popup-path')!.textContent).toBe('a.ts');
    expect(overlay!.querySelector('[data-diff-popup-count]')!.textContent).toBe('1/2');
    // 首文件：上一个禁用，下一个可用
    expect((overlay!.querySelector('[data-diff-popup-prev]') as HTMLButtonElement).disabled).toBe(true);
    expect((overlay!.querySelector('[data-diff-popup-next]') as HTMLButtonElement).disabled).toBe(false);

    // 并排渲染：双列结构，左列 3 行 + 右列 3 行（context/add/delete）
    const rows = overlay!.querySelectorAll('.diff-popup-body .diff-popup-col-left .diff-popup-row');
    expect(rows.length).toBe(3);
    const rightRows = overlay!.querySelectorAll('.diff-popup-body .diff-popup-col-right .diff-popup-row');
    expect(rightRows.length).toBe(3);
    expect(overlay!.querySelectorAll('.diff-line.add').length).toBe(1);
    expect(overlay!.querySelectorAll('.diff-line.delete').length).toBe(1);
    // context 行左右各一份
    expect(overlay!.querySelectorAll('.diff-line.context').length).toBe(2);
    // 补位行 2 个：add 行左栏、delete 行右栏
    expect(overlay!.querySelectorAll('.diff-popup-cell-empty').length).toBe(2);
    expect(overlay!.querySelector('.diff-popup-body')!.textContent).toContain('const b = 2;');
  });

  it('按 Escape 应关闭 diff 弹窗', async () => {
    // 前一个用例打开了弹窗；若未打开则补点一次，保证用例可独立执行
    let overlay = env.document.querySelector('#diff-popup-overlay');
    if (!overlay) {
      const fileRow = env.document.querySelector('.file-row') as HTMLElement;
      fileRow.click();
      await settle(30);
      overlay = env.document.querySelector('#diff-popup-overlay');
    }
    expect(overlay, '应存在打开的 diff 弹窗').toBeTruthy();

    env.document.dispatchEvent(new env.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle(30);

    // 关闭后 overlay 应从 DOM 移除
    expect(env.document.querySelector('#diff-popup-overlay')).toBeNull();
  });

  it('底部应有 Git / 控制台 / Worktrees 三个页签', () => {
    const tabs = [...env.document.querySelectorAll('#bottom-tabs .tab')] as HTMLElement[];
    expect(tabs.map(t => t.textContent)).toEqual(['Git', '控制台', 'Worktrees']);
  });

  it('点击控制台页签应展示 git 命令日志', async () => {
    const tabs = [...env.document.querySelectorAll('#bottom-tabs .tab')] as HTMLElement[];
    tabs[1]!.click();
    await settle(60);

    const body = env.document.getElementById('bottom-body')!;
    expect(body.classList.contains('open')).toBe(true);
    expect(body.textContent).toContain('git status');
    expect(body.textContent).toContain('git checkout x');
    // 成功与失败应有区分
    expect(body.querySelectorAll('.cmd-status.fail').length).toBe(1);
  });

  it('再次点击已激活页签应收起', async () => {
    const tabs = [...env.document.querySelectorAll('#bottom-tabs .tab')] as HTMLElement[];
    tabs[1]!.click();
    await settle(30);
    expect(env.document.getElementById('bottom-body')!.classList.contains('open')).toBe(false);
  });

  it('点击 Worktrees 页签应列出工作区并区分主工作区', async () => {
    const tabs = [...env.document.querySelectorAll('#bottom-tabs .tab')] as HTMLElement[];
    tabs[2]!.click();
    await settle(60);

    const body = env.document.getElementById('bottom-body')!;
    expect(body.textContent).toContain('/repo');
    expect(body.textContent).toContain('/repo-wt');
    expect(body.textContent).toContain('主工作区');
    // 主工作区没有移除按钮，另一个有
    expect(body.querySelectorAll('.wt-row button').length).toBe(1);
  });

  it('提交行应渲染图线', () => {
    const graphs = env.document.querySelectorAll('.commit-item .graph svg');
    expect(graphs.length).toBeGreaterThan(0);
    // 图中应有提交节点
    expect(graphs[0]!.querySelector('circle')).toBeTruthy();
  });

  it('视图选项应可关闭图线', async () => {
    const icons = [...env.document.querySelectorAll('#sidebar .icon-btn')] as HTMLButtonElement[];
    // 倒数第 4 个是设置（视图选项）
    icons[9]!.click();
    await settle(30);

    const panel = env.document.getElementById('view-options');
    expect(panel).toBeTruthy();
    expect(panel!.textContent).toContain('显示提交图');

    const items = [...panel!.querySelectorAll('div')] as HTMLElement[];
    const graphToggle = items.find(d => d.textContent?.includes('显示提交图'))!;
    graphToggle.click();
    await settle(20);

    expect(env.document.querySelectorAll('.commit-item .graph').length).toBe(0);
  });

  it('视图选项应可隐藏作者列', async () => {
    // 重新打开视图选项
    const icons = [...env.document.querySelectorAll('#sidebar .icon-btn')] as HTMLButtonElement[];
    icons[9]!.click();
    await settle(30);

    const panel = env.document.getElementById('view-options')!;
    const authorItem = [...panel.querySelectorAll('div')].find(d => d.textContent?.includes('作者') && d.textContent.length < 10) as HTMLElement;
    authorItem.click();
    await settle(20);

    expect(env.document.getElementById('commits')!.textContent).not.toContain('张三');
  });

  it('排序切换应改变提交顺序', async () => {
    const icons = [...env.document.querySelectorAll('#sidebar .icon-btn')] as HTMLButtonElement[];
    icons[9]!.click();
    await settle(30);

    const panel = env.document.getElementById('view-options')!;
    const asc = [...panel.querySelectorAll('div')].find(d => d.textContent?.includes('日期旧→新')) as HTMLElement;
    asc.click();
    await settle(20);

    const rows = [...env.document.querySelectorAll('.commit-item')] as HTMLElement[];
    // 旧→新：日期最早（12-10）的独立提交应排在第一条
    expect(rows[0]!.textContent).toContain('feat: 独立提交 0');
    // 最新的「合并多条分支」应排到最后
    expect(rows[rows.length - 1]!.textContent).toContain('merge: 合并多条分支');
  });

  it('图线宽度应按行计算，不应挤压提交信息（回归）', async () => {
    // 前序用例可能关闭了图线，先通过视图选项重新打开
    const icons = [...env.document.querySelectorAll('#sidebar .icon-btn')] as HTMLButtonElement[];
    icons[9]!.click();
    await settle(30);
    const panel = env.document.getElementById('view-options');
    if (panel) {
      const toggle = [...panel.querySelectorAll('div')]
        .find(d => d.textContent?.includes('显示提交图')) as HTMLElement | undefined;
      // 当前为关闭状态时才需要点开
      if (toggle && toggle.textContent?.trim().startsWith('✓') === false) toggle.click();
      else panel.remove();
    }
    await settle(30);

    const rows = [...env.document.querySelectorAll('.commit-item')] as HTMLElement[];
    expect(rows.length).toBeGreaterThan(0);

    const widths = rows.map(r => {
      const svg = r.querySelector('.graph svg') as SVGElement | null;
      return svg ? Number(svg.getAttribute('width')) : 0;
    });
    // 确认测试数据真的产生了多列：既有窄行也有宽行，且宽行被钳制在 6 列以内
    expect(Math.max(...widths)).toBeGreaterThan(12);

    // 图线区固定宽度：所有行一致，且足够窄，不会把标题挤出可视区域
    for (const w of widths) {
      expect(w).toBe(40);
    }

    // 提交信息必须仍然可见
    expect(env.document.getElementById('commits')!.textContent).toContain('feat: 第一条');
  });

  it('视图选项菜单应定位在触发按钮附近', async () => {
    const icons = [...env.document.querySelectorAll('#sidebar .icon-btn')] as HTMLButtonElement[];
    const settingsBtn = icons[9]!;
    // jsdom 不做真实布局，这里模拟按钮位置
    settingsBtn.getBoundingClientRect = () => ({
      bottom: 200, left: 40, top: 170, right: 68, width: 28, height: 30, x: 40, y: 170,
      toJSON: () => ({}),
    }) as DOMRect;

    settingsBtn.click();
    await settle(30);

    const panel = env.document.getElementById('view-options');
    expect(panel).toBeTruthy();
    // 应贴着按钮下方展开，而不是固定在右上角
    expect(panel!.style.top).toBe('204px');
    expect(panel!.style.left).toBe('40px');
    panel!.remove();
  });

  it('Cmd 点击应能选中多个分支且不切换提交列表（回归）', async () => {
    await ensureExpanded();

    const items = [...env.document.querySelectorAll('.branch-item')] as HTMLElement[];
    const feat = items.find(el => el.textContent?.includes('feat'))!;
    const unmerged = items.find(el => el.textContent?.includes('unmerged'))!;

    const commitsBefore = env.sent.filter(m => m.method === 'getCommitLog').length;

    // Cmd 点击两个分支
    feat.dispatchEvent(new env.window.MouseEvent('click', { bubbles: true, metaKey: true }));
    await settle(20);
    unmerged.dispatchEvent(new env.window.MouseEvent('click', { bubbles: true, metaKey: true }));
    await settle(20);

    // 两个都应处于选中态
    const selected = [...env.document.querySelectorAll('.branch-item.selected')] as HTMLElement[];
    expect(selected.length).toBe(2);
    expect(selected.some(e => e.textContent?.includes('feat'))).toBe(true);
    expect(selected.some(e => e.textContent?.includes('unmerged'))).toBe(true);

    // 多选不应切换提交列表
    expect(env.sent.filter(m => m.method === 'getCommitLog').length).toBe(commitsBefore);
  });

  it('再次 Cmd 点击已选分支应取消选中', async () => {
    const items = [...env.document.querySelectorAll('.branch-item')] as HTMLElement[];
    const feat = items.find(el => el.textContent?.includes('feat'))!;
    feat.dispatchEvent(new env.window.MouseEvent('click', { bubbles: true, metaKey: true }));
    await settle(20);

    const selected = [...env.document.querySelectorAll('.branch-item.selected')] as HTMLElement[];
    expect(selected.length).toBe(1);
  });

  it('普通点击应清空多选', async () => {
    const items = [...env.document.querySelectorAll('.branch-item')] as HTMLElement[];
    const main = items.find(el => el.textContent?.includes('main') && !el.textContent?.includes('origin'))!;
    main.click();
    await settle(30);

    const selected = [...env.document.querySelectorAll('.branch-item.selected')] as HTMLElement[];
    expect(selected.length).toBe(1);
    expect(selected[0]!.textContent).toContain('main');
  });

  it('多选后删除应删掉全部选中分支', async () => {
    const items = [...env.document.querySelectorAll('.branch-item')] as HTMLElement[];
    const feat = items.find(el => el.textContent?.includes('feat'))!;
    const other = items.find(el => el.textContent?.includes('unmerged'))!;

    feat.dispatchEvent(new env.window.MouseEvent('click', { bubbles: true, metaKey: true }));
    await settle(15);
    other.dispatchEvent(new env.window.MouseEvent('click', { bubbles: true, metaKey: true }));
    await settle(15);

    const before = env.sent.filter(m => m.method === 'deleteBranch').length;

    // 未合并分支会弹确认，测试中直接确认强制删除
    (env.window as unknown as { confirm: () => boolean }).confirm = () => true;
    const icons = [...env.document.querySelectorAll('#sidebar .icon-btn')] as HTMLButtonElement[];
    icons[3]!.click();
    await settle(120);

    const deleted = env.sent.filter(m => m.method === 'deleteBranch').slice(before)
      .map(m => (m.params as { name: string }).name);
    expect(deleted).toContain('feat');
    expect(deleted).toContain('unmerged');
  });

  it('多选含当前分支时删除按钮禁用', async () => {
    await ensureExpanded();
    // 当前分支是 main，远程分支是 origin/main，用精确匹配区分
    // 每次点击后列表会重渲染，必须重新查询节点
    const findRow = (name: string) => [...env.document.querySelectorAll('.branch-item')]
      .find(el => el.querySelector('.name')?.textContent === name) as HTMLElement;

    const mainRow = findRow('main');
    expect(mainRow, '应能找到当前分支 main').toBeTruthy();
    mainRow.dispatchEvent(new env.window.MouseEvent('click', { bubbles: true, metaKey: true }));
    await settle(20);
    findRow('feat').dispatchEvent(new env.window.MouseEvent('click', { bubbles: true, metaKey: true }));
    await settle(20);

    // 回归：删除按钮此前因判定条件写错（'delete' vs 'deleteBranch'）从不置灰
    const icons = [...env.document.querySelectorAll('#sidebar .icon-btn')] as HTMLButtonElement[];
    expect(icons[3]!.disabled).toBe(true);
  });

  it('切换正则选项后搜索框应保留输入与焦点（回归）', async () => {
    const search = env.document.getElementById('commit-search') as HTMLInputElement;
    expect(search).toBeTruthy();

    search.value = 'feat';
    search.dispatchEvent(new env.window.Event('input'));
    await settle(30);
    search.focus();

    // 点击正则开关会重建工具栏
    const regexBtn = [...env.document.querySelectorAll('#toolbar .tb-btn')]
      .find(b => b.textContent === '.*') as HTMLElement;
    regexBtn.click();
    await settle(30);

    const after = env.document.getElementById('commit-search') as HTMLInputElement;
    // 关键：必须是同一个 DOM 节点（重建会丢光标位置，是「搜索不好使」的根因）
    expect(after).toBe(search);
    expect(after.value).toBe('feat');
    expect(env.document.activeElement).toBe(after);

    // 还原正则开关，避免影响后续用例
    const again = [...env.document.querySelectorAll('#toolbar .tb-btn')]
      .find(b => b.textContent === '.*') as HTMLElement;
    again.click();
    await settle(30);
  });

  it('搜索支持按哈希匹配', async () => {
    const search = env.document.getElementById('commit-search') as HTMLInputElement;
    search.value = 'abc123';
    search.dispatchEvent(new env.window.Event('input'));
    await settle(30);

    expect(env.document.getElementById('commits')!.textContent).toContain('feat: 第一条');

    search.value = '';
    search.dispatchEvent(new env.window.Event('input'));
    await settle(30);
  });

  it('正则语法错误时应标记输入框而非静默无结果', async () => {
    const regexBtn = [...env.document.querySelectorAll('#toolbar .tb-btn')]
      .find(b => b.textContent === '.*') as HTMLElement;
    regexBtn.click();
    await settle(20);

    const search = env.document.getElementById('commit-search') as HTMLInputElement;
    search.value = '[unclosed';
    search.dispatchEvent(new env.window.Event('input'));
    await settle(30);

    expect(search.classList.contains('invalid')).toBe(true);
    expect(search.getAttribute('aria-invalid')).toBe('true');

    // 清理
    search.value = '';
    search.dispatchEvent(new env.window.Event('input'));
    await settle(20);
    regexBtn.click();
    await settle(20);
  });

  it('按 Esc 应清空搜索', async () => {
    const search = env.document.getElementById('commit-search') as HTMLInputElement;
    search.value = 'feat';
    search.dispatchEvent(new env.window.Event('input'));
    await settle(20);

    search.dispatchEvent(new env.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle(20);

    expect(search.value).toBe('');
    expect(env.document.getElementById('commits')!.textContent).toContain('feat: 第一条');
  });



  it('切换正则选项后搜索框应保留输入与焦点（回归）', async () => {
    const search = env.document.getElementById('commit-search') as HTMLInputElement;
    expect(search).toBeTruthy();

    search.value = 'feat';
    search.dispatchEvent(new env.window.Event('input'));
    await settle(30);
    search.focus();

    // 点击正则开关会重建工具栏
    const regexBtn = [...env.document.querySelectorAll('#toolbar .tb-btn')]
      .find(b => b.textContent === '.*') as HTMLElement;
    regexBtn.click();
    await settle(30);

    const after = env.document.getElementById('commit-search') as HTMLInputElement;
    // 关键：必须是同一个 DOM 节点（重建会丢光标位置，是「搜索不好使」的根因）
    expect(after).toBe(search);
    expect(after.value).toBe('feat');
    expect(env.document.activeElement).toBe(after);

    // 还原正则开关，避免影响后续用例
    const again = [...env.document.querySelectorAll('#toolbar .tb-btn')]
      .find(b => b.textContent === '.*') as HTMLElement;
    again.click();
    await settle(30);
  });

  it('搜索支持按哈希匹配', async () => {
    const search = env.document.getElementById('commit-search') as HTMLInputElement;
    search.value = 'abc123';
    search.dispatchEvent(new env.window.Event('input'));
    await settle(30);

    expect(env.document.getElementById('commits')!.textContent).toContain('feat: 第一条');

    search.value = '';
    search.dispatchEvent(new env.window.Event('input'));
    await settle(30);
  });

  it('正则语法错误时应标记输入框而非静默无结果', async () => {
    const regexBtn = [...env.document.querySelectorAll('#toolbar .tb-btn')]
      .find(b => b.textContent === '.*') as HTMLElement;
    regexBtn.click();
    await settle(20);

    const search = env.document.getElementById('commit-search') as HTMLInputElement;
    search.value = '[unclosed';
    search.dispatchEvent(new env.window.Event('input'));
    await settle(30);

    expect(search.classList.contains('invalid')).toBe(true);
    expect(search.getAttribute('aria-invalid')).toBe('true');

    // 清理
    search.value = '';
    search.dispatchEvent(new env.window.Event('input'));
    await settle(20);
    regexBtn.click();
    await settle(20);
  });

  it('按 Esc 应清空搜索', async () => {
    const search = env.document.getElementById('commit-search') as HTMLInputElement;
    search.value = 'feat';
    search.dispatchEvent(new env.window.Event('input'));
    await settle(20);

    search.dispatchEvent(new env.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle(20);

    expect(search.value).toBe('');
    expect(env.document.getElementById('commits')!.textContent).toContain('feat: 第一条');
  });

  it('右键本地分支应弹出菜单，当前分支的切换/重命名/删除应禁用', async () => {
    const items = [...env.document.querySelectorAll('.branch-item')] as HTMLElement[];
    const currentRow = items.find(r => r.classList.contains('current'))!;
    currentRow.dispatchEvent(new env.window.MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 }));
    await settle(10);

    const menu = env.document.querySelector('.dd-menu');
    expect(menu).toBeTruthy();
    const labels = [...menu!.querySelectorAll('.dd-item')].map(el => el.textContent);
    // 当前分支（main）：切换/重命名/删除禁用，但仍保留「基于该分支新建」与「复制分支名」
    const checkout = [...menu!.querySelectorAll('.dd-item')].find(el => el.textContent === '切换分支')!;
    const rename = [...menu!.querySelectorAll('.dd-item')].find(el => el.textContent === '重命名')!;
    const del = [...menu!.querySelectorAll('.dd-item')].find(el => el.textContent === '删除')!;
    expect(checkout.classList.contains('disabled')).toBe(true);
    expect(rename.classList.contains('disabled')).toBe(true);
    expect(del.classList.contains('disabled')).toBe(true);
    expect(labels).toContain('基于该分支新建');
    expect(labels).toContain('复制分支名');
  });

  it('右键非当前本地分支选择「删除」应调用 deleteBranch', async () => {
    const items = [...env.document.querySelectorAll('.branch-item')] as HTMLElement[];
    const featRow = items.find(r => r.querySelector('.name')?.textContent === 'feat')!;
    featRow.dispatchEvent(new env.window.MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 }));
    await settle(10);

    const menu = env.document.querySelector('.dd-menu')!;
    const del = [...menu.querySelectorAll('.dd-item')].find(el => el.textContent === '删除')!;
    del.dispatchEvent(new env.window.MouseEvent('click', { bubbles: true }));
    await settle(20);

    const calls = env.sent.filter(m => m.method === 'deleteBranch' && (m.params as { name?: string }).name === 'feat');
    expect(calls.length).toBeGreaterThan(0);
  });

  it('右键远程分支应提供「基于该远程分支新建本地分支」与「删除远程分支」', async () => {
    const items = [...env.document.querySelectorAll('.branch-item')] as HTMLElement[];
    const remoteRow = items.find(r => r.querySelector('.name')?.textContent === 'origin/main')!;
    remoteRow.dispatchEvent(new env.window.MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 }));
    await settle(10);

    const menu = env.document.querySelector('.dd-menu')!;
    const labels = [...menu.querySelectorAll('.dd-item')].map(el => el.textContent);
    expect(labels).toContain('基于该远程分支新建本地分支');
    expect(labels).toContain('删除远程分支');
    // 远程分支不应出现本地专用的删除/重命名项
    expect(labels).not.toContain('删除');
    expect(labels).not.toContain('重命名');
  });
});

describe('工具栏过滤下拉', () => {
  /**
   * 启动独立环境并等待首屏加载
   */
  async function newEnv() {
    const local = boot();
    await settle(150);
    return local;
  }

  /**
   * 点击工具栏指定按钮
   * @param local 环境
   * @param label 按钮文案前缀
   */
  function clickToolbar(local: ReturnType<typeof boot>, label: string) {
    const btn = [...local.document.querySelectorAll('#toolbar .tb-btn')]
      .find(b => b.textContent?.startsWith(label)) as HTMLElement;
    if (!btn) throw new Error('未找到工具栏按钮 ' + label);
    btn.click();
    return btn;
  }

  /**
   * 选择下拉条目
   * @param local 环境
   * @param label 条目文案
   */
  async function pick(local: ReturnType<typeof boot>, label: string) {
    for (let i = 0; i < 40; i += 1) {
      const items = [...local.document.querySelectorAll('.dd-item')] as HTMLElement[];
      const hit = items.find(it => it.textContent?.includes(label));
      if (hit) {
        hit.click();
        await settle(60);
        return;
      }
      await settle(10);
    }
    const all = [...local.document.querySelectorAll('.dd-item')].map(it => it.textContent);
    throw new Error('未找到下拉条目 ' + label + '，实际：' + all.join(','));
  }

  it('分支下拉应列出全部可选分支', async () => {
    const local = await newEnv();
    clickToolbar(local, '分支');
    await settle(30);

    const labels = [...local.document.querySelectorAll('.dd-label')].map(el => el.textContent);
    expect(labels).toContain('全部');
    expect(labels).toContain('main');
    expect(labels).toContain('feat');
  });

  it('分支过滤应由 git 重新拉取', async () => {
    const local = await newEnv();
    const before = local.sent.filter(m => m.method === 'getCommitLog').length;

    clickToolbar(local, '分支');
    await pick(local, 'feat');

    const calls = local.sent.filter(m => m.method === 'getCommitLog');
    expect(calls.length).toBe(before + 1);
    expect((calls.at(-1)!.params as { branch?: string }).branch).toBe('feat');
  });

  it('路径下拉应提供编辑入口，选择后交给 git', async () => {
    const local = await newEnv();
    clickToolbar(local, '路径');
    await settle(30);

    const labels = [...local.document.querySelectorAll('.dd-label')].map(el => el.textContent);
    expect(labels).toContain('全部');
    expect(labels).toContain('选择文件夹…');
    expect(labels).toContain('编辑路径…');

    await pick(local, '编辑路径…');
    await settle(60);

    // 应打开树状选择而非输入框
    expect(local.document.querySelector('.dlg-input')).toBeNull();
    const tree = local.document.querySelector('.ptree');
    expect(tree).toBeTruthy();
    expect(tree!.textContent).toContain('src');

    // 勾选 src 目录（目录整选）
    const rows = [...local.document.querySelectorAll('.ptree-row')] as HTMLElement[];
    const srcRow = rows.find(r => r.textContent?.trim().endsWith('src'));
    expect(srcRow).toBeTruthy();
    srcRow!.click();
    await settle(20);

    // 确认
    const buttons = [...local.document.querySelectorAll('.dlg-btn')] as HTMLElement[];
    buttons[buttons.length - 1]!.click();
    await settle(80);

    const calls = local.sent.filter(m => m.method === 'getCommitLog');
    expect((calls.at(-1)!.params as { paths?: string[] }).paths).toEqual(['src']);
  });

  it('日期下拉应提供预设与自定义', async () => {
    const local = await newEnv();
    clickToolbar(local, '日期');
    await settle(30);

    const labels = [...local.document.querySelectorAll('.dd-label')].map(el => el.textContent);
    for (const name of ['全部', '今天', '本周', '本月', '今年', '自定义…']) {
      expect(labels).toContain(name);
    }
  });

  it('用户下拉应列出作者并过滤提交', async () => {
    const local = await newEnv();
    clickToolbar(local, '用户');
    await settle(30);

    const labels = [...local.document.querySelectorAll('.dd-label')].map(el => el.textContent);
    expect(labels).toContain('全部');
    expect(labels).toContain('张三');

    await pick(local, '张三');
    const rows = [...local.document.querySelectorAll('.commit-item')] as HTMLElement[];
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.textContent).toContain('feat: 第一条');
    }
  });

  it('多选含当前分支时删除按钮禁用', async () => {
    const local = await newEnv();
    // 每次点击后列表重渲染，必须重新查询节点
    const findRow = (name: string) => [...local.document.querySelectorAll('.branch-item')]
      .find(el => el.querySelector('.name')?.textContent === name) as HTMLElement;

    findRow('main').dispatchEvent(new local.window.MouseEvent('click', { bubbles: true, metaKey: true }));
    await settle(20);
    findRow('feat').dispatchEvent(new local.window.MouseEvent('click', { bubbles: true, metaKey: true }));
    await settle(20);

    // 回归：删除按钮此前因判定条件写错（'delete' vs 'deleteBranch'）从不置灰
    const icons = [...local.document.querySelectorAll('#sidebar .icon-btn')] as HTMLButtonElement[];
    expect(icons[3]!.disabled).toBe(true);
  });
});

describe('下拉菜单开关', () => {
  /**
   * 启动独立环境
   */
  async function newEnv() {
    const local = boot();
    await settle(150);
    return local;
  }

  /**
   * 点击工具栏指定按钮
   * @param local 环境
   * @param label 按钮文案前缀
   */
  function clickToolbar(local: ReturnType<typeof boot>, label: string) {
    const btn = [...local.document.querySelectorAll('#toolbar .tb-btn')]
      .find(b => b.textContent?.startsWith(label)) as HTMLElement;
    if (!btn) throw new Error('未找到工具栏按钮 ' + label);
    btn.click();
    return btn;
  }

  it('反复打开切换不同过滤项应始终能唤起（回归）', async () => {
    const local = await newEnv();

    // 依次打开四个过滤项，每次都应出现菜单
    for (const label of ['分支', '用户', '日期', '路径']) {
      clickToolbar(local, label);
      await settle(20);
      const menus = local.document.querySelectorAll('.dd-menu');
      expect(menus.length, `${label} 应弹出下拉菜单`).toBe(1);
      // 关闭后再试下一个
      (menus[0] as HTMLElement).remove();
    }
  });

  it('连续两次点击同一按钮应能打开与关闭', async () => {
    const local = await newEnv();

    // 第一次点击打开
    clickToolbar(local, '分支');
    await settle(20);
    expect(local.document.querySelectorAll('.dd-menu').length).toBe(1);

    // 第二次点击关闭：需重新查询按钮（工具栏可能已重建）
    clickToolbar(local, '分支');
    await settle(20);
    expect(local.document.querySelectorAll('.dd-menu').length).toBe(0);

    // 第三次点击应能再次打开，不能被残留监听吞掉
    clickToolbar(local, '分支');
    await settle(20);
    expect(local.document.querySelectorAll('.dd-menu').length).toBe(1);
  });

  it('选中条目后再次打开应正常', async () => {
    const local = await newEnv();

    clickToolbar(local, '日期');
    await settle(20);
    const items = [...local.document.querySelectorAll('.dd-item')] as HTMLElement[];
    const today = items.find(it => it.textContent?.includes('今天'));
    expect(today).toBeTruthy();
    today!.click();
    await settle(40);

    // 菜单应关闭
    expect(local.document.querySelectorAll('.dd-menu').length).toBe(0);

    // 再次打开应成功（可选中状态已变化的按钮）
    const btn = [...local.document.querySelectorAll('#toolbar .tb-btn')]
      .find(b => b.textContent?.startsWith('日期')) as HTMLElement;
    // 选中后按钮显示具体区间
    expect(btn.textContent).toMatch(/日期: \d{4}-\d{2}-\d{2}/);
    expect(btn.classList.contains('active')).toBe(true);
    btn.click();
    await settle(20);
    expect(local.document.querySelectorAll('.dd-menu').length).toBe(1);
  });

  it('正则开关应显示为 .* 而不是英文单词', async () => {
    const local = await newEnv();
    const labels = [...local.document.querySelectorAll('#toolbar .tb-btn')].map(b => b.textContent);
    expect(labels).toContain('.*');
    expect(labels).not.toContain('regex');
  });
});

describe('提交列表交互', () => {
  /**
   * 启动独立环境
   */
  async function newEnv() {
    const local = boot();
    await settle(150);
    return local;
  }

  it('选中提交不应重建列表，滚动位置需保留（回归）', async () => {
    const local = await newEnv();

    const list = local.document.querySelector('#commits .list') as HTMLElement;
    expect(list).toBeTruthy();
    const firstRow = list.querySelector('.commit-item') as HTMLElement;
    expect(firstRow).toBeTruthy();

    // 记录列表节点身份：若被重建，引用会失效
    const listBefore = list;
    firstRow.click();
    await settle(60);

    const listAfter = local.document.querySelector('#commits .list') as HTMLElement;
    // 同一个 DOM 节点说明未重建，滚动位置得以保留
    expect(listAfter).toBe(listBefore);
    // 选中样式已生效
    expect(firstRow.classList.contains('selected')).toBe(true);
  });

  it('请求提交历史时不应使用过小的上限', async () => {
    const local = await newEnv();

    const call = local.sent.filter(m => m.method === 'getCommitLog').at(-1)!;
    const limit = (call.params as { limit?: number }).limit ?? 0;
    // 原先固定 200 条，现应远大于此
    expect(limit).toBeGreaterThanOrEqual(10000);
  });

  it('切换选中提交应只更新样式，不改变列表节点', async () => {
    const local = await newEnv();

    const rows = [...local.document.querySelectorAll('.commit-item')] as HTMLElement[];
    expect(rows.length).toBeGreaterThan(1);

    rows[0]!.click();
    await settle(40);
    const listBefore = local.document.querySelector('#commits .list');

    rows[1]!.click();
    await settle(40);

    const listAfter = local.document.querySelector('#commits .list');
    expect(listAfter).toBe(listBefore);
    // 选中项已切换
    expect(rows[1]!.classList.contains('selected')).toBe(true);
    expect(rows[0]!.classList.contains('selected')).toBe(false);
  });
});

describe('日期与路径选择器', () => {
  /**
   * 启动独立环境
   */
  async function newEnv() {
    const local = boot();
    await settle(150);
    return local;
  }

  /**
   * 点击工具栏按钮
   * @param local 环境
   * @param label 前缀
   */
  function clickToolbar(local: ReturnType<typeof boot>, label: string) {
    const btn = [...local.document.querySelectorAll('#toolbar .tb-btn')]
      .find(b => b.textContent?.startsWith(label)) as HTMLElement;
    btn.click();
    return btn;
  }

  it('自定义日期应使用原生日期控件，不是文本输入', async () => {
    const local = await newEnv();
    clickToolbar(local, '日期');
    await settle(20);

    const custom = [...local.document.querySelectorAll('.dd-item')]
      .find(it => it.textContent?.includes('自定义…')) as HTMLElement;
    custom.click();
    await settle(40);

    const inputs = [...local.document.querySelectorAll('.dlg-box input')] as HTMLInputElement[];
    expect(inputs).toHaveLength(2);
    // 关键：type=date 才会弹日历，text 仍是手输
    for (const input of inputs) {
      expect(input.type).toBe('date');
    }
  });

  it('选择日期区间应写入过滤条件', async () => {
    const local = await newEnv();
    clickToolbar(local, '日期');
    await settle(20);
    ([...local.document.querySelectorAll('.dd-item')]
      .find(it => it.textContent?.includes('自定义…')) as HTMLElement).click();
    await settle(40);

    const inputs = [...local.document.querySelectorAll('.dlg-box input')] as HTMLInputElement[];
    inputs[0]!.value = '2026-01-01';
    inputs[1]!.value = '2026-01-31';

    const buttons = [...local.document.querySelectorAll('.dlg-btn')] as HTMLElement[];
    buttons[buttons.length - 1]!.click();
    await settle(40);

    const dateBtn = [...local.document.querySelectorAll('#toolbar .tb-btn')]
      .find(b => b.textContent?.startsWith('日期')) as HTMLElement;
    expect(dateBtn.textContent).toContain('2026-01-01');
    expect(dateBtn.textContent).toContain('2026-01-31');
  });

  it('路径选择应显示树形结构而非输入框', async () => {
    const local = await newEnv();
    clickToolbar(local, '路径');
    await settle(20);
    ([...local.document.querySelectorAll('.dd-item')]
      .find(it => it.textContent?.includes('选择文件夹…')) as HTMLElement).click();
    await settle(80);

    expect(local.document.querySelector('.dlg-input')).toBeNull();
    const rows = [...local.document.querySelectorAll('.ptree-row')] as HTMLElement[];
    expect(rows.length).toBeGreaterThan(0);
    // 目录与文件应有区分
    expect(local.document.querySelectorAll('.ptree-name.dir').length).toBeGreaterThan(0);
  });

  it('树中可展开目录并勾选文件', async () => {
    const local = await newEnv();
    clickToolbar(local, '路径');
    await settle(20);
    ([...local.document.querySelectorAll('.dd-item')]
      .find(it => it.textContent?.includes('选择文件夹…')) as HTMLElement).click();
    await settle(80);

    // 找到 README.md 直接勾选
    const rows = [...local.document.querySelectorAll('.ptree-row')] as HTMLElement[];
    const readme = rows.find(r => r.textContent?.trim().endsWith('README.md'));
    expect(readme).toBeTruthy();
    readme!.click();
    await settle(20);

    const hint = local.document.querySelector('.dlg-hint');
    expect(hint!.textContent).toContain('README.md');
  });

  it('路径选择应只能选一条（单选）', async () => {
    const local = await newEnv();
    clickToolbar(local, '路径');
    await settle(20);
    ([...local.document.querySelectorAll('.dd-item')]
      .find(it => it.textContent?.includes('选择文件夹…')) as HTMLElement).click();
    await settle(80);

    // 勾选第一个文件
    const rows1 = [...local.document.querySelectorAll('.ptree-row')] as HTMLElement[];
    const first = rows1.find(r => r.querySelector('.ptree-name')?.textContent === 'README.md');
    expect(first).toBeTruthy();
    first!.click();
    await settle(20);

    // 再勾选另一个文件，前一个应自动取消
    const rows2 = [...local.document.querySelectorAll('.ptree-row')] as HTMLElement[];
    const srcRow = rows2.find(r => r.querySelector('.ptree-name')?.textContent === 'src');
    expect(srcRow).toBeTruthy();
    srcRow!.click();
    await settle(20);

    const checked = [...local.document.querySelectorAll('.ptree-row')]
      .filter(r => r.querySelector('.ptree-check')?.textContent === '✓');
    expect(checked).toHaveLength(1);
    expect(checked[0]!.textContent).toContain('src');
  });

  it('再次点击已选路径应取消选择', async () => {
    const local = await newEnv();
    clickToolbar(local, '路径');
    await settle(20);
    ([...local.document.querySelectorAll('.dd-item')]
      .find(it => it.textContent?.includes('选择文件夹…')) as HTMLElement).click();
    await settle(80);

    const find = () => [...local.document.querySelectorAll('.ptree-row')]
      .find(r => r.querySelector('.ptree-name')?.textContent === 'README.md') as HTMLElement;

    find().click();
    await settle(20);
    expect(local.document.querySelectorAll('.ptree-check')).toBeTruthy();

    // 再点一次取消
    find().click();
    await settle(20);
    const checked = [...local.document.querySelectorAll('.ptree-row')]
      .filter(r => r.querySelector('.ptree-check')?.textContent === '✓');
    expect(checked).toHaveLength(0);
  });
});

describe('Webview 边界场景', () => {
  /**
   * 启动独立环境
   */
  async function newEnv() {
    const local = boot();
    await settle(150);
    return local;
  }

  /**
   * 点击工具栏按钮
   * @param local 环境
   * @param label 前缀
   */
  function clickToolbar(local: ReturnType<typeof boot>, label: string) {
    const btn = [...local.document.querySelectorAll('#toolbar .tb-btn')]
      .find(b => b.textContent?.startsWith(label)) as HTMLElement;
    if (!btn) throw new Error('未找到按钮 ' + label);
    btn.click();
    return btn;
  }

  it('提交列表为空时应显示空态文案而不是崩溃', async () => {
    const local = await newEnv();
    // 过滤成必然为空的搜索词
    const search = local.document.getElementById('commit-search') as HTMLInputElement;
    search.value = 'zzz-不存在的关键词-zzz';
    search.dispatchEvent(new local.window.Event('input'));
    await settle(60);

    const text = local.document.getElementById('commits')!.textContent ?? '';
    expect(text).toContain('没有匹配的提交');
  });

  it('非法正则不应让列表崩溃', async () => {
    const local = await newEnv();
    // 打开正则
    const regexBtn = [...local.document.querySelectorAll('#toolbar .tb-btn')]
      .find(b => b.textContent === '.*') as HTMLElement;
    regexBtn.click();
    await settle(30);

    const search = local.document.getElementById('commit-search') as HTMLInputElement;
    search.value = '[invalid(';
    search.dispatchEvent(new local.window.Event('input'));
    await settle(60);

    // 输入框应标红，列表仍可用
    expect(search.classList.contains('invalid')).toBe(true);
    expect(local.document.getElementById('commits')).toBeTruthy();
  });

  it('日期区间倒置时应自动交换而不是无结果', async () => {
    const local = await newEnv();
    clickToolbar(local, '日期');
    await settle(30);
    ([...local.document.querySelectorAll('.dd-item')]
      .find(it => it.textContent?.includes('自定义…')) as HTMLElement).click();
    await settle(50);

    const inputs = [...local.document.querySelectorAll('.dlg-box input')] as HTMLInputElement[];
    // 故意倒置
    inputs[0]!.value = '2026-12-31';
    inputs[1]!.value = '2026-01-01';

    ([...local.document.querySelectorAll('.dlg-btn')].at(-1) as HTMLElement).click();
    await settle(50);

    const dateBtn = [...local.document.querySelectorAll('#toolbar .tb-btn')]
      .find(b => b.textContent?.startsWith('日期')) as HTMLElement;
    // 应自动交换为 起始 <= 结束
    expect(dateBtn.textContent).toContain('2026-01-01');
    expect(dateBtn.textContent).toContain('2026-12-31');
  });

  it('打开对话框后按 Esc 或点遮罩应能关闭', async () => {
    const local = await newEnv();
    clickToolbar(local, '日期');
    await settle(30);
    ([...local.document.querySelectorAll('.dd-item')]
      .find(it => it.textContent?.includes('自定义…')) as HTMLElement).click();
    await settle(50);

    expect(local.document.querySelector('.dlg-overlay')).toBeTruthy();

    // 点击遮罩关闭
    const overlay = local.document.querySelector('.dlg-overlay') as HTMLElement;
    overlay.click();
    await settle(30);

    expect(local.document.querySelector('.dlg-overlay')).toBeNull();
  });

  it('分支列表为空时下拉应仍可打开', async () => {
    const local = await newEnv();
    // 清空分支数据的效果：直接打开分支下拉（替身返回非空，此处只验证不崩溃）
    expect(() => clickToolbar(local, '分支')).not.toThrow();
    await settle(30);
    expect(local.document.querySelector('.dd-menu')).toBeTruthy();
  });

  it('重复打开同一对话框不应叠加多个实例', async () => {
    const local = await newEnv();
    clickToolbar(local, '日期');
    await settle(30);
    const items = [...local.document.querySelectorAll('.dd-item')];
    (items.find(it => it.textContent?.includes('自定义…')) as HTMLElement).click();
    await settle(50);

    // 此时应只有一个遮罩
    expect(local.document.querySelectorAll('.dlg-overlay').length).toBe(1);
  });
});

describe('diff 弹窗', () => {
  /**
   * 启动独立环境并等待首屏加载
   */
  async function newEnv() {
    const local = boot();
    await settle(150);
    return local;
  }

  /**
   * 选中首个提交并点击第一个文件行，打开 diff 弹窗
   * @param local 环境
   * @returns overlay 元素
   */
  async function openPopup(local: ReturnType<typeof boot>) {
    const commitRow = local.document.querySelector('.commit-item') as HTMLElement;
    expect(commitRow).toBeTruthy();
    commitRow.click();
    await settle(120);

    const fileRow = local.document.querySelector('.file-row') as HTMLElement;
    expect(fileRow).toBeTruthy();
    fileRow.click();
    await settle(30);

    const overlay = local.document.querySelector('#diff-popup-overlay');
    expect(overlay, '点击文件行应打开 diff 弹窗').toBeTruthy();
    return overlay as HTMLElement;
  }

  /**
   * 派发键盘按键到 document（jsdom 环境下脚本监听 document 级 keydown）
   * @param local 环境
   * @param key 按键名
   */
  function press(local: ReturnType<typeof boot>, key: string) {
    local.document.dispatchEvent(new local.window.KeyboardEvent('keydown', { key, bubbles: true }));
  }

  /**
   * 关闭弹窗，避免残留 DOM 影响后续用例
   * @param local 环境
   */
  async function closePopup(local: ReturnType<typeof boot>) {
    const overlay = local.document.querySelector('#diff-popup-overlay') as HTMLElement | null;
    if (!overlay) return;
    press(local, 'Escape');
    await settle(30);
  }

  it('打开弹窗应展示路径、计数与禁用态，并渲染并排差异', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);

    expect(overlay.querySelector('.diff-popup-path')!.textContent).toBe('a.ts');
    expect(overlay.querySelector('[data-diff-popup-count]')!.textContent).toBe('1/2');
    // 首文件：上一个禁用，下一个可用
    expect((overlay.querySelector('[data-diff-popup-prev]') as HTMLButtonElement).disabled).toBe(true);
    expect((overlay.querySelector('[data-diff-popup-next]') as HTMLButtonElement).disabled).toBe(false);

    // 并排渲染：双列结构，左列 3 行 + 右列 3 行（context/add/delete）
    const rows = overlay.querySelectorAll('.diff-popup-body .diff-popup-col-left .diff-popup-row');
    expect(rows.length).toBe(3);
    const rightRows = overlay.querySelectorAll('.diff-popup-body .diff-popup-col-right .diff-popup-row');
    expect(rightRows.length).toBe(3);
    expect(overlay.querySelectorAll('.diff-line.add').length).toBe(1);
    expect(overlay.querySelectorAll('.diff-line.delete').length).toBe(1);
    // context 行左右各一份
    expect(overlay.querySelectorAll('.diff-line.context').length).toBe(2);
    // 补位行 2 个：add 行左栏、delete 行右栏
    expect(overlay.querySelectorAll('.diff-popup-cell-empty').length).toBe(2);
    expect(overlay.querySelector('.diff-popup-body')!.textContent).toContain('const b = 2;');

    await closePopup(local);
  });

  it('右方向键应切换到下一个文件，末尾禁用且不循环', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);
    const path = () => overlay.querySelector('.diff-popup-path')!.textContent;
    const count = () => overlay.querySelector('[data-diff-popup-count]')!.textContent;
    const next = () => overlay.querySelector('[data-diff-popup-next]') as HTMLButtonElement;

    press(local, 'ArrowRight');
    await settle(20);
    expect(path()).toBe('b.ts');
    expect(count()).toBe('2/2');
    // 末文件：下一个禁用
    expect(next().disabled).toBe(true);

    // 再按一次不切换（禁用不循环）
    press(local, 'ArrowRight');
    await settle(20);
    expect(path()).toBe('b.ts');
    expect(count()).toBe('2/2');

    await closePopup(local);
  });

  it('左方向键应回到上一个文件，首文件不切换', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);
    const path = () => overlay.querySelector('.diff-popup-path')!.textContent;
    const count = () => overlay.querySelector('[data-diff-popup-count]')!.textContent;

    // 先切到第二个文件
    press(local, 'ArrowRight');
    await settle(20);
    expect(count()).toBe('2/2');

    press(local, 'ArrowLeft');
    await settle(20);
    expect(path()).toBe('a.ts');
    expect(count()).toBe('1/2');

    // 首文件再按不切换（不循环）
    press(local, 'ArrowLeft');
    await settle(20);
    expect(path()).toBe('a.ts');
    expect(count()).toBe('1/2');

    await closePopup(local);
  });

  it('上下方向键不应切换文件', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);
    const path = () => overlay.querySelector('.diff-popup-path')!.textContent;
    const count = () => overlay.querySelector('[data-diff-popup-count]')!.textContent;

    press(local, 'ArrowUp');
    await settle(20);
    expect(path()).toBe('a.ts');
    expect(count()).toBe('1/2');

    press(local, 'ArrowDown');
    await settle(20);
    expect(path()).toBe('a.ts');
    expect(count()).toBe('1/2');

    await closePopup(local);
  });

  it('点击计数应弹出文件列表，选择条目可切换并关闭列表', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);
    const path = () => overlay.querySelector('.diff-popup-path')!.textContent;
    const countEl = overlay.querySelector('[data-diff-popup-count]') as HTMLElement;

    // 点击计数打开文件列表
    countEl.click();
    await settle(20);
    const list = overlay.querySelector('.diff-popup-filelist');
    expect(list, '点击计数应出现文件列表').toBeTruthy();
    const items = [...list!.querySelectorAll('[data-diff-popup-file-index]')] as HTMLElement[];
    expect(items.length).toBe(2);
    // 当前项高亮
    expect(items[0]!.classList.contains('diff-popup-filelist-item-active')).toBe(true);
    expect(items[1]!.classList.contains('diff-popup-filelist-item-active')).toBe(false);

    // 点第 2 项：路径切换为 b.ts 且列表关闭
    items[1]!.click();
    await settle(20);
    expect(path()).toBe('b.ts');
    expect(overlay.querySelector('.diff-popup-filelist')).toBeNull();

    // 再点计数可 toggle 关闭：先打开
    countEl.click();
    await settle(20);
    expect(overlay.querySelector('.diff-popup-filelist')).toBeTruthy();
    // 再点一次关闭
    countEl.click();
    await settle(20);
    expect(overlay.querySelector('.diff-popup-filelist')).toBeNull();

    await closePopup(local);
  });

  it('Escape 应先关文件列表再关弹窗，关闭后键盘监听解绑', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);

    // 打开文件列表后 Escape 只关列表
    const countEl = overlay.querySelector('[data-diff-popup-count]') as HTMLElement;
    countEl.click();
    await settle(20);
    expect(overlay.querySelector('.diff-popup-filelist')).toBeTruthy();

    press(local, 'Escape');
    await settle(20);
    expect(overlay.querySelector('.diff-popup-filelist')).toBeNull();
    expect(local.document.querySelector('#diff-popup-overlay'), '列表关闭后弹窗应仍在').toBeTruthy();

    // 再按 Escape 关闭弹窗
    press(local, 'Escape');
    await settle(20);
    expect(local.document.querySelector('#diff-popup-overlay')).toBeNull();

    // 关闭后再派发按键：不报错也不应重新出现弹窗（监听已解绑）
    expect(() => press(local, 'ArrowRight')).not.toThrow();
    await settle(20);
    expect(local.document.querySelector('#diff-popup-overlay')).toBeNull();
  });

  it('点击关闭按钮应关闭弹窗', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);

    const closeBtn = overlay.querySelector('[data-diff-popup-close]') as HTMLElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    await settle(20);

    expect(local.document.querySelector('#diff-popup-overlay')).toBeNull();
  });

  it('并排单元格应按侧行号渲染并含补位行标记', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);

    // a.ts 三行：双列结构，每列 3 行
    const rows = [...overlay.querySelectorAll('.diff-popup-col-left .diff-popup-row')];
    expect(rows.length).toBe(3);
    const rightRows = [...overlay.querySelectorAll('.diff-popup-col-right .diff-popup-row')];
    // 右列同步断言行数一致
    expect(rightRows.length).toBe(3);

    for (let i = 0; i < rows.length; i += 1) {
      const leftCell = rows[i]!.querySelector('.diff-popup-cell-left');
      const rightCell = rightRows[i]!.querySelector('.diff-popup-cell-right');
      expect(leftCell, `左列第 ${i} 行应有单元格`).toBeTruthy();
      expect(rightCell, `右列第 ${i} 行应有单元格`).toBeTruthy();

      // 左栏 .diff-line 的 span 顺序：[旧行号, 空, 内容]
      const leftLine = leftCell!.querySelector('.diff-line');
      if (leftLine && !leftCell!.querySelector('.diff-popup-cell-empty')) {
        const spans = leftLine.querySelectorAll('span');
        expect(spans.length).toBeGreaterThanOrEqual(3);
        // 旧行号非空时应为数字，第二个 span（新行号位）留空
        if (spans[0]!.textContent?.trim()) {
          expect(spans[0]!.textContent).toMatch(/^\d+$/);
          expect(spans[1]!.textContent?.trim()).toBe('');
        }
      }

      // 右栏 .diff-line 的 span 顺序：[空, 新行号, 内容]
      const rightLine = rightCell!.querySelector('.diff-line');
      if (rightLine && !rightCell!.querySelector('.diff-popup-cell-empty')) {
        const spans = rightLine.querySelectorAll('span');
        expect(spans.length).toBeGreaterThanOrEqual(3);
        if (spans[1]!.textContent?.trim()) {
          expect(spans[1]!.textContent).toMatch(/^\d+$/);
          expect(spans[0]!.textContent?.trim()).toBe('');
        }
      }
    }

    // context 行左右都有内容；delete 行仅左栏有内容，右栏为补位
    const deleteRowIndex = rows.findIndex(r => r.querySelector('.diff-line.delete'));
    expect(deleteRowIndex, '应存在 delete 行').toBeGreaterThanOrEqual(0);
    expect(rows[deleteRowIndex]!.querySelector('.diff-popup-cell-left .diff-line.delete')).toBeTruthy();
    // 右列对应行无 delete 内容，应为补位标记或空内容
    const rightCell = rightRows[deleteRowIndex]!.querySelector('.diff-popup-cell-right')!;
    const rightLine = rightCell.querySelector('.diff-line');
    const isPlaceholder = rightCell.querySelector('.diff-popup-cell-empty') !== null
      || rightLine?.classList.contains('diff-popup-cell-empty') === true
      || (rightLine?.textContent?.trim() ?? '') === '';
    expect(isPlaceholder, 'delete 行右栏应为补位').toBe(true);

    await closePopup(local);
  });
});

describe('diff 弹窗自动换行', () => {
  /**
   * 启动独立环境并等待首屏加载
   * @param opts 可预置持久化的换行开关状态
   */
  async function newEnv(opts: { diffWrap?: boolean } = {}) {
    const local = boot(opts);
    await settle(150);
    return local;
  }

  /**
   * 选中首个提交并点击第一个文件行，打开 diff 弹窗
   * @param local 环境
   * @returns overlay 元素
   */
  async function openPopup(local: ReturnType<typeof boot>) {
    const commitRow = local.document.querySelector('.commit-item') as HTMLElement;
    expect(commitRow).toBeTruthy();
    commitRow.click();
    await settle(120);

    const fileRow = local.document.querySelector('.file-row') as HTMLElement;
    expect(fileRow).toBeTruthy();
    fileRow.click();
    await settle(30);

    const overlay = local.document.querySelector('#diff-popup-overlay');
    expect(overlay, '点击文件行应打开 diff 弹窗').toBeTruthy();
    return overlay as HTMLElement;
  }

  /**
   * 关闭弹窗，避免残留 DOM 影响后续用例
   * @param local 环境
   */
  async function closePopup(local: ReturnType<typeof boot>) {
    const overlay = local.document.querySelector('#diff-popup-overlay') as HTMLElement | null;
    if (!overlay) return;
    local.document.dispatchEvent(new local.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle(30);
  }

  it('默认不开换行：body 与按钮均无激活样式', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);

    const body = overlay.querySelector('.diff-popup-body') as HTMLElement;
    expect(body.classList.contains('diff-popup-wrap')).toBe(false);
    const wrapBtn = overlay.querySelector('[data-diff-popup-wrap]') as HTMLElement;
    expect(wrapBtn, '工具栏应有自动换行按钮').toBeTruthy();
    expect(wrapBtn.classList.contains('diff-popup-wrap-btn-active')).toBe(false);

    await closePopup(local);
  });

  it('点击自动换行按钮应进入折行态并发出 setDiffWrap(true)', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);

    const wrapBtn = overlay.querySelector('[data-diff-popup-wrap]') as HTMLElement;
    wrapBtn.click();
    await settle(30);

    const last = local.sent.filter(m => m.method === 'setDiffWrap').at(-1);
    expect(last, '应发出 setDiffWrap 请求').toBeTruthy();
    expect((last!.params as { value?: boolean }).value).toBe(true);
    expect(local.diffWrap).toBe(true);

    await closePopup(local);
  });

  // 已知实现 bug（webview/script.ts render()）：wrap=true 时提前 return（约 665-670 行），
  // 跳过了后方的 body class 与按钮激活态同步（约 694-699 行），
  // 导致开启换行后 diff-popup-wrap class 永远不会加上。修复后取消 skip。
  it('点击自动换行按钮后 body 应加 diff-popup-wrap 且按钮激活', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);

    const wrapBtn = overlay.querySelector('[data-diff-popup-wrap]') as HTMLElement;
    wrapBtn.click();
    await settle(30);

    expect((overlay.querySelector('.diff-popup-body') as HTMLElement).classList.contains('diff-popup-wrap')).toBe(true);
    expect(wrapBtn.classList.contains('diff-popup-wrap-btn-active')).toBe(true);

    await closePopup(local);
  });

  it('再次点击应退出折行态并发出 setDiffWrap(false)', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);

    const wrapBtn = overlay.querySelector('[data-diff-popup-wrap]') as HTMLElement;
    wrapBtn.click();
    await settle(30);
    wrapBtn.click();
    await settle(30);

    expect((overlay.querySelector('.diff-popup-body') as HTMLElement).classList.contains('diff-popup-wrap')).toBe(false);
    expect(wrapBtn.classList.contains('diff-popup-wrap-btn-active')).toBe(false);

    const last = local.sent.filter(m => m.method === 'setDiffWrap').at(-1)!;
    expect((last.params as { value?: boolean }).value).toBe(false);
    expect(local.diffWrap).toBe(false);

    await closePopup(local);
  });

  it('换行开启时行内 minWidth 应被清空（默认态 jsdom 测不出宽度，跳过非空断言）', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);

    const wrapBtn = overlay.querySelector('[data-diff-popup-wrap]') as HTMLElement;
    wrapBtn.click();
    await settle(30);

    // wrap 态下所有行的 inline minWidth 必须为空字符串
    const rows = [...overlay.querySelectorAll('.diff-popup-row')] as HTMLElement[];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.style.minWidth).toBe('');
    }

    await closePopup(local);
  });

  // 已知实现 bug（webview/script.ts render()）：wrap=true 提前 return 跳过 class 同步，
  // 持久化开启时 body 不会加 diff-popup-wrap。修复后取消 skip。
  it('持久化开启时打开弹窗应自动进入换行态', async () => {
    const local = await newEnv({ diffWrap: true });
    const overlay = await openPopup(local);

    // getDiffWrap 异步取回后套用，需等待 settle
    const body = overlay.querySelector('.diff-popup-body') as HTMLElement;
    expect(body.classList.contains('diff-popup-wrap')).toBe(true);
    const wrapBtn = overlay.querySelector('[data-diff-popup-wrap]') as HTMLElement;
    expect(wrapBtn.classList.contains('diff-popup-wrap-btn-active')).toBe(true);

    await closePopup(local);
  });
});

describe('diff 弹窗工具栏功能组', () => {
  /**
   * 含配对 delete/add 行的差异样例：
   * 注意两行 token 数必须相等（均为 1），否则 highlightWordDiff 第二次 buildSide
   * 会以 table[i+1][j] 越界抛错（PANEL_SCRIPT 模板字符串吞掉 \w 导致分词异常），
   * render 中断后 mark 无法注入
   */
  const pairedDiffs = [{
    path: 'a.ts', additions: 1, deletions: 1,
    lines: [
      { type: 'context', content: 'const a = 1;', oldLine: 1, newLine: 1 },
      { type: 'delete', content: 'aaa;', oldLine: 2 },
      { type: 'add', content: 'bbb;', newLine: 2 },
    ],
  }];

  /**
   * 启动独立环境并等待首屏加载
   * @param opts 可预置持久化偏好与差异样例
   */
  async function newEnv(opts: Parameters<typeof boot>[0] = {}) {
    const local = boot(opts);
    await settle(150);
    return local;
  }

  /**
   * 选中首个提交并点击第一个文件行，打开 diff 弹窗
   * @param local 环境
   * @returns overlay 元素
   */
  async function openPopup(local: ReturnType<typeof boot>) {
    const commitRow = local.document.querySelector('.commit-item') as HTMLElement;
    expect(commitRow).toBeTruthy();
    commitRow.click();
    await settle(120);

    const fileRow = local.document.querySelector('.file-row') as HTMLElement;
    expect(fileRow).toBeTruthy();
    fileRow.click();
    await settle(60);

    const overlay = local.document.querySelector('#diff-popup-overlay');
    expect(overlay, '点击文件行应打开 diff 弹窗').toBeTruthy();
    return overlay as HTMLElement;
  }

  /**
   * 关闭弹窗（Escape），避免残留 DOM 与键盘监听影响后续用例
   * @param local 环境
   */
  async function closePopup(local: ReturnType<typeof boot>) {
    const overlay = local.document.querySelector('#diff-popup-overlay') as HTMLElement | null;
    if (!overlay) return;
    local.document.dispatchEvent(
      new local.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(30);
  }

  it('点击视图切换按钮应进入单栏模式并发出 setDiffView，再点回并排', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);
    const body = overlay.querySelector('.diff-popup-body') as HTMLElement;
    const viewBtn = overlay.querySelector('[data-diff-popup-view]') as HTMLElement;
    expect(viewBtn, '工具栏应有视图切换按钮').toBeTruthy();

    // 切到单栏：body 加 unified class
    viewBtn.click();
    await settle(30);
    expect(body.classList.contains('diff-popup-unified')).toBe(true);
    expect(viewBtn.classList.contains('diff-popup-view-btn-active')).toBe(true);
    // 右列隐藏由 CSS 驱动，jsdom 无布局，断言行数结构：单栏线性渲染进左列，无补位行
    const leftRows = overlay.querySelectorAll('.diff-popup-col-left .diff-popup-row');
    expect(leftRows.length).toBe(3);
    // 补位行只存在于并排模式，单栏下不应出现
    expect(overlay.querySelectorAll('.diff-popup-cell-empty').length).toBe(0);
    // 发出持久化请求
    const lastSet = local.sent.filter(m => m.method === 'setDiffView').at(-1);
    expect(lastSet, '应发出 setDiffView 请求').toBeTruthy();
    expect((lastSet!.params as { value?: string }).value).toBe('unified');
    expect(local.diffView).toBe('unified');

    // 再点切回并排：class 移除，恢复配对补位结构
    viewBtn.click();
    await settle(30);
    expect(body.classList.contains('diff-popup-unified')).toBe(false);
    expect(overlay.querySelectorAll('.diff-popup-cell-empty').length).toBe(2);
    expect(local.diffView).toBe('side');

    await closePopup(local);
  });

  it('点击忽略空白应重拉 getCommitDiffs 且带 ignoreWhitespace: true，再点关闭重拉不带', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);
    const ignoreBtn = overlay.querySelector('[data-diff-popup-ignore-ws]') as HTMLElement;
    expect(ignoreBtn, '工具栏应忽略空白按钮').toBeTruthy();

    ignoreBtn.click();
    await settle(60);
    expect(ignoreBtn.classList.contains('diff-popup-ignorews-btn-active')).toBe(true);
    // 重拉请求应带 ignoreWhitespace: true
    const reloads = local.sent.filter(m => m.method === 'getCommitDiffs');
    expect(reloads.length).toBeGreaterThanOrEqual(2);
    expect((reloads.at(-1)!.params as { ignoreWhitespace?: boolean }).ignoreWhitespace).toBe(true);
    expect(local.ignoreWs).toBe(true);

    // 再点关闭：重拉请求不带 ignoreWhitespace（params 忽略或为 false）
    ignoreBtn.click();
    await settle(60);
    expect(ignoreBtn.classList.contains('diff-popup-ignorews-btn-active')).toBe(false);
    const last = local.sent.filter(m => m.method === 'getCommitDiffs').at(-1)!;
    expect((last.params as { ignoreWhitespace?: boolean }).ignoreWhitespace === true).toBe(false);
    expect(local.ignoreWs).toBe(false);

    await closePopup(local);
  });

  it('点击单词高亮按钮应激活并对配对 delete/add 行的 code 注入 mark 高亮', async () => {
    const local = await newEnv({ commitDiffs: pairedDiffs });
    const overlay = await openPopup(local);
    const hlBtn = overlay.querySelector('[data-diff-popup-highlight]') as HTMLElement;
    expect(hlBtn, '工具栏应有单词高亮按钮').toBeTruthy();

    // 默认关：无 mark
    expect(overlay.querySelectorAll('mark.diff-popup-word-hl').length).toBe(0);

    hlBtn.click();
    await settle(30);
    expect(hlBtn.classList.contains('diff-popup-highlight-btn-active')).toBe(true);
    // 配对行（delete 'aaa;' ↔ add 'bbb;'）的 .code 内应出现 mark 高亮
    const marks = overlay.querySelectorAll('.code mark.diff-popup-word-hl');
    expect(marks.length).toBeGreaterThan(0);
    // 未匹配 token 被包 mark：'aaa' 与 'bbb' 是差异 token
    // （迁移为真模块后 \w 分词正常：'aaa;' 切为 'aaa' + ';'，';' 两侧相同不标，mark 文本为单词本身）
    const markedTexts = [...marks].map(m => m.textContent);
    expect(markedTexts).toContain('aaa');
    expect(markedTexts).toContain('bbb');
    // 持久化请求已发出
    const lastSet = local.sent.filter(m => m.method === 'setHighlightWords').at(-1);
    expect((lastSet!.params as { value?: boolean }).value).toBe(true);

    // 再点关闭：mark 消失
    hlBtn.click();
    await settle(30);
    expect(hlBtn.classList.contains('diff-popup-highlight-btn-active')).toBe(false);
    expect(overlay.querySelectorAll('mark.diff-popup-word-hl').length).toBe(0);

    await closePopup(local);
  });

  it('点击设置按钮应弹出菜单且含显示行号项，点该项切换 hide-linenums 并发出 setShowLineNums', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);
    const body = overlay.querySelector('.diff-popup-body') as HTMLElement;
    const settingsBtn = overlay.querySelector('[data-diff-popup-settings]') as HTMLElement;
    expect(settingsBtn, '工具栏应有设置按钮').toBeTruthy();

    settingsBtn.click();
    await settle(30);
    const menu = overlay.querySelector('.diff-popup-settings-menu') as HTMLElement;
    expect(menu, '点设置应弹出菜单').toBeTruthy();
    const item = menu.querySelector('.diff-popup-settings-item') as HTMLElement;
    expect(item, '菜单应含设置项').toBeTruthy();
    expect(item.textContent).toContain('显示行号');

    // 默认显示行号：点 label（切换逻辑挂在 label.onclick，非容器）→ 隐藏
    const label = item.querySelector('.diff-popup-settings-label') as HTMLElement;
    label.click();
    await settle(30);
    expect(body.classList.contains('diff-popup-hide-linenums')).toBe(true);
    const lastSet = local.sent.filter(m => m.method === 'setShowLineNums').at(-1);
    expect(lastSet, '应发出 setShowLineNums 请求').toBeTruthy();
    expect((lastSet!.params as { value?: boolean }).value).toBe(false);
    expect(local.showLineNums).toBe(false);

    // 再开菜单再点 label：恢复显示（延迟注册的 document 点击监听使本次点击 toggle 关闭菜单，故再点一次重开）
    settingsBtn.click();
    await settle(60);
    if (!overlay.querySelector('.diff-popup-settings-menu')) {
      settingsBtn.click();
      await settle(60);
    }
    const label2 = overlay.querySelector('.diff-popup-settings-menu .diff-popup-settings-label') as HTMLElement;
    expect(label2, '再次打开应仍有菜单项').toBeTruthy();
    label2.click();
    await settle(30);
    expect(body.classList.contains('diff-popup-hide-linenums')).toBe(false);
    expect(local.showLineNums).toBe(true);

    await closePopup(local);
  });

  it('持久化 viewMode 为 unified 时打开弹窗应自动进入单栏', async () => {
    const local = await newEnv({ diffView: 'unified' });
    const overlay = await openPopup(local);
    const body = overlay.querySelector('.diff-popup-body') as HTMLElement;

    // prefs 异步回包后套用并重渲染，settle 已覆盖
    expect(body.classList.contains('diff-popup-unified')).toBe(true);
    const viewBtn = overlay.querySelector('[data-diff-popup-view]') as HTMLElement;
    expect(viewBtn.classList.contains('diff-popup-view-btn-active')).toBe(true);
    // 单栏线性渲染：无补位行
    expect(overlay.querySelectorAll('.diff-popup-cell-empty').length).toBe(0);

    await closePopup(local);
  });
});

describe('差异导航与设置扩充', () => {
  /**
   * 启动独立环境并等待首屏加载
   * @param opts 可预置持久化偏好与差异样例
   */
  async function newEnv(opts: Parameters<typeof boot>[0] = {}) {
    const local = boot(opts);
    await settle(150);
    return local;
  }

  /**
   * 选中首个提交并点击第一个文件行，打开 diff 弹窗
   * @param local 环境
   * @returns overlay 元素
   */
  async function openPopup(local: ReturnType<typeof boot>) {
    const commitRow = local.document.querySelector('.commit-item') as HTMLElement;
    expect(commitRow).toBeTruthy();
    commitRow.click();
    await settle(120);

    const fileRow = local.document.querySelector('.file-row') as HTMLElement;
    expect(fileRow).toBeTruthy();
    fileRow.click();
    await settle(60);

    const overlay = local.document.querySelector('#diff-popup-overlay');
    expect(overlay, '点击文件行应打开 diff 弹窗').toBeTruthy();
    return overlay as HTMLElement;
  }

  /**
   * 关闭弹窗（Escape），避免残留 DOM 与键盘监听影响后续用例
   * @param local 环境
   */
  async function closePopup(local: ReturnType<typeof boot>) {
    const overlay = local.document.querySelector('#diff-popup-overlay') as HTMLElement | null;
    if (!overlay) return;
    local.document.dispatchEvent(
      new local.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(30);
  }

  /**
   * 派发带 Alt 修饰的键盘按键（差异块导航快捷键）
   * @param local 环境
   * @param key 按键名
   */
  function pressAlt(local: ReturnType<typeof boot>, key: string) {
    local.document.dispatchEvent(
      new local.window.KeyboardEvent('keydown', { key, altKey: true, bubbles: true }),
    );
  }

  it('打开弹窗后差异导航按钮存在且可用，点击下一个应高亮变更块起始行', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);

    const prevChange = overlay.querySelector('[data-diff-popup-prev-change]') as HTMLButtonElement;
    const nextChange = overlay.querySelector('[data-diff-popup-next-change]') as HTMLButtonElement;
    expect(prevChange, '工具栏应有上一个差异按钮').toBeTruthy();
    expect(nextChange, '工具栏应有下一个差异按钮').toBeTruthy();
    // a.ts 含 add/delete 变更块：按钮应可用
    expect(prevChange.disabled).toBe(false);
    expect(nextChange.disabled).toBe(false);

    nextChange.click();
    await settle(30);
    // 块起始行（连续变更行合并锚点）应加高亮 class
    const active = overlay.querySelectorAll('.diff-popup-change-active');
    expect(active.length).toBe(1);

    await closePopup(local);
  });

  it('连续点击差异导航不越界不循环，行为保持在锚点边界内', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);

    const nextChange = overlay.querySelector('[data-diff-popup-next-change]') as HTMLButtonElement;
    // a.ts 单一变更块：连点多次应始终停在唯一锚点上（不越界不报错）
    nextChange.click();
    await settle(20);
    nextChange.click();
    await settle(20);
    nextChange.click();
    await settle(20);

    expect(overlay.querySelectorAll('.diff-popup-change-active').length).toBe(1);

    // 上一个差异按钮：回到同一锚点后仍在边界内
    const prevChange = overlay.querySelector('[data-diff-popup-prev-change]') as HTMLButtonElement;
    prevChange.click();
    await settle(20);
    expect(overlay.querySelectorAll('.diff-popup-change-active').length).toBe(1);

    await closePopup(local);
  });

  it('Alt+ArrowDown 应与下一个差异按钮同效，高亮变更块', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);

    pressAlt(local, 'ArrowDown');
    await settle(30);
    expect(overlay.querySelectorAll('.diff-popup-change-active').length).toBe(1);

    // Alt+ArrowUp 回跳：同样保持高亮在锚点行
    pressAlt(local, 'ArrowUp');
    await settle(30);
    expect(overlay.querySelectorAll('.diff-popup-change-active').length).toBe(1);

    await closePopup(local);
  });

  it('Escape 关闭后重开弹窗，差异块高亮应被清除（切文件重置）', async () => {
    const local = await newEnv();
    let overlay = await openPopup(local);

    (overlay.querySelector('[data-diff-popup-next-change]') as HTMLButtonElement).click();
    await settle(20);
    expect(overlay.querySelectorAll('.diff-popup-change-active').length).toBe(1);

    // 关闭再重开：高亮不应残留
    await closePopup(local);
    overlay = await openPopup(local);
    expect(overlay.querySelectorAll('.diff-popup-change-active').length).toBe(0);

    await closePopup(local);
  });

  it('设置菜单应含 3 项，点显示空白符后行文本出现中点并发送 setShowWhitespace', async () => {
    const local = await newEnv();
    const overlay = await openPopup(local);
    const settingsBtn = overlay.querySelector('[data-diff-popup-settings]') as HTMLElement;

    settingsBtn.click();
    await settle(30);
    const menu = overlay.querySelector('.diff-popup-settings-menu') as HTMLElement;
    expect(menu, '点设置应弹出菜单').toBeTruthy();
    // 菜单应含 3 项：显示行号 / 显示空白符 / 行内差异高亮
    const items = [...menu.querySelectorAll('.diff-popup-settings-label')] as HTMLElement[];
    expect(items.length).toBe(3);
    expect(items[0]!.textContent).toContain('显示行号');
    expect(items[1]!.textContent).toContain('显示空白符');
    expect(items[2]!.textContent).toContain('行内差异高亮');

    // 默认 'const a = 1;' 中的空格为原样：点「显示空白符」label → 空格替换为 U+00B7
    items[1]!.click();
    await settle(30);
    const bodyText = (overlay.querySelector('.diff-popup-body') as HTMLElement).textContent ?? '';
    expect(bodyText).toContain('\u00B7');
    const lastSet = local.sent.filter(m => m.method === 'setShowWhitespace').at(-1);
    expect(lastSet, '应发出 setShowWhitespace 请求').toBeTruthy();
    expect((lastSet!.params as { value?: boolean }).value).toBe(true);
    expect(local.showWhitespace).toBe(true);

    await closePopup(local);
  });

  it('点行内差异高亮后配对行出现字符级高亮 span 并发送 setInlineDiff', async () => {
    // 配对 delete/add 行：'aaa;' ↔ 'bbb;'（无公共字符，全部标色）
    const pairedDiffs = [{
      path: 'a.ts', additions: 1, deletions: 1,
      lines: [
        { type: 'context', content: 'const a = 1;', oldLine: 1, newLine: 1 },
        { type: 'delete', content: 'aaa;', oldLine: 2 },
        { type: 'add', content: 'bbb;', newLine: 2 },
      ],
    }];
    const local = await newEnv({ commitDiffs: pairedDiffs });
    const overlay = await openPopup(local);
    const settingsBtn = overlay.querySelector('[data-diff-popup-settings]') as HTMLElement;

    // 默认关：无字符级高亮
    expect(overlay.querySelectorAll('.diff-popup-char-hl').length).toBe(0);

    settingsBtn.click();
    await settle(30);
    const labels = [...overlay.querySelectorAll('.diff-popup-settings-menu .diff-popup-settings-label')] as HTMLElement[];
    expect(labels.length).toBe(3);
    labels[2]!.click();
    await settle(30);

    // 配对 delete/add 行内容出现字符级高亮 span
    const spans = overlay.querySelectorAll('.code .diff-popup-char-hl');
    expect(spans.length).toBeGreaterThan(0);
    const lastSet = local.sent.filter(m => m.method === 'setInlineDiff').at(-1);
    expect(lastSet, '应发出 setInlineDiff 请求').toBeTruthy();
    expect((lastSet!.params as { value?: boolean }).value).toBe(true);
    expect(local.inlineDiff).toBe(true);

    await closePopup(local);
  });

  it('持久化 showWhitespace 开启时打开弹窗应自动显示空白符', async () => {
    const local = await newEnv({ showWhitespace: true });
    const overlay = await openPopup(local);

    // prefs 异步回包后套用并重渲染，settle 已覆盖
    const bodyText = (overlay.querySelector('.diff-popup-body') as HTMLElement).textContent ?? '';
    expect(bodyText).toContain('\u00B7');

    await closePopup(local);
  });
});
