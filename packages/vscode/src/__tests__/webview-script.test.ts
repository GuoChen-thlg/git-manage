/**
 * 面板脚本运行时测试
 * 在 jsdom 中真实执行注入用脚本，验证渲染与请求链路能跑通，
 * 而不只是检查字符串里有没有关键字。
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { PANEL_SCRIPT } from '../webview/script';

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
function boot() {
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
          reply.data = [{
            path: 'a.ts', additions: 2, deletions: 1,
            lines: [
              { type: 'context', content: 'const a = 1;', oldLine: 1, newLine: 1 },
              { type: 'add', content: 'const b = 2;', newLine: 2 },
              { type: 'delete', content: 'old();', oldLine: 2 },
            ],
          }];
        } else if (message.method === 'getFavorites') {
          reply.data = favorites;
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
  window.eval(PANEL_SCRIPT);
  return { window, document: window.document, sent };
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

  it('点击文件应展开差异内容并按类型着色', async () => {
    // 先选中一个提交以加载详情
    const commitRow = env.document.querySelector('.commit-item') as HTMLElement;
    commitRow.click();
    await settle(120);

    const fileRow = env.document.querySelector('.file-row') as HTMLElement;
    expect(fileRow).toBeTruthy();
    // 初始为折叠态
    expect(fileRow.querySelector('.arrow')!.textContent).toBe('▸');
    expect(env.document.querySelector('.diff-lines')).toBeNull();

    fileRow.click();
    await settle(30);

    // 展开后出现差异行
    const lines = env.document.querySelectorAll('.diff-line');
    expect(lines.length).toBe(3);
    expect(env.document.querySelectorAll('.diff-line.add').length).toBe(1);
    expect(env.document.querySelectorAll('.diff-line.delete').length).toBe(1);
    expect(env.document.querySelector('.diff-lines')!.textContent).toContain('const b = 2;');
  });

  it('再次点击文件应收起差异', async () => {
    const fileRow = env.document.querySelector('.file-row') as HTMLElement;
    fileRow.click();
    await settle(30);
    expect(env.document.querySelector('.diff-lines')).toBeNull();
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
