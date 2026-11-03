/**
 * 提交列表渲染：工具栏、提交行、提交图、过滤与排序
 * 从 script.ts 原样迁移
 */

import { el, logDebug } from './dom';
import { state } from './state';
import { iconButton } from './render-sidebar';
import { toast, showPrompt, showDropdown } from './dialogs';
import { loadAll, loadDetail, loadCommits } from './data';
import { editPaths, pickCustomDateRange, computeDateRange } from './filters';
import { runCommitAction } from './render-detail';

/** 图线配色（与现有面板同一套） */
const GRAPH_COLORS = ['#589df6', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

/**
 * 渲染顶部工具栏
 */
export function renderToolbar(): void {
  const box = document.getElementById('toolbar');
  if (!box) return;
  // 记录焦点元素，重建后恢复，避免切换选项时输入被打断
  const active = document.activeElement as HTMLInputElement | null;
  const hadSearchFocus = active && active.id === 'commit-search';
  const selectionStart = hadSearchFocus ? active.selectionStart : null;

  // 先取出搜索框节点再清空容器，否则节点被销毁、无法复用
  let search = document.getElementById('commit-search') as HTMLInputElement | null;
  box.innerHTML = '';

  if (!search) {
    search = document.createElement('input');
    search.id = 'commit-search';
    search.type = 'text';
    search.placeholder = '搜索提交信息或哈希';
    search.oninput = function () {
      state.search = search!.value;
      updateSearchState();
      renderCommits();
    };
    search.onkeydown = function (ev) {
      // Enter 立即跳到首个匹配提交，Esc 清空
      if (ev.key === 'Enter') {
        const first = sortCommits(filterCommits(state.commits))[0];
        if (first) {
          state.selectedCommit = first.hash;
          renderCommits();
          void loadDetail(first.hash);
        }
      } else if (ev.key === 'Escape') {
        search!.value = '';
        state.search = '';
        updateSearchState();
        renderCommits();
      }
    };
  }
  search.value = state.search || '';
  box.appendChild(search);

  // 正则 / 大小写
  // 正则开关用 .* 表达，符合常见编辑器习惯；大小写用 Cc 是通行写法
  box.appendChild(toolbarToggle('.*', '使用正则表达式', state.useRegex, function () {
    state.useRegex = !state.useRegex;
    renderToolbar();
    renderCommits();
  }));
  box.appendChild(toolbarToggle('Cc', '区分大小写', state.caseSensitive, function () {
    state.caseSensitive = !state.caseSensitive;
    renderToolbar();
    renderCommits();
  }));

  // 新节点上恢复焦点
  if (hadSearchFocus) {
    search.focus();
    if (selectionStart !== null && search.setSelectionRange) {
      try { search.setSelectionRange(selectionStart, selectionStart); } catch { /* 非文本框时忽略 */ }
    }
  }

  box.appendChild(el('span', 'tb-sep'));

  // 过滤项：均为下拉菜单，点击展开可选值（与 OpenChamber 一致）
  const branchBtn = toolbarButton('分支', state.filterBranch, function () {
    void pickFilterBranch(branchBtn);
  });
  box.appendChild(branchBtn);

  const userBtn = toolbarButton('用户', state.filterUser, function () {
    void pickFilterUser(userBtn);
  });
  box.appendChild(userBtn);

  // 日期显示为「起始 ~ 结束」摘要
  const dateValue = state.filterDateFrom || state.filterDateTo
    ? (state.filterDateFrom || '') + ' ~ ' + (state.filterDateTo || '')
    : null;
  const dateBtn = toolbarButton('日期', dateValue, function () {
    void pickFilterDate(dateBtn);
  });
  box.appendChild(dateBtn);

  // 路径为单选，直接显示，过长时由按钮省略
  const pathValue = state.filterPath || null;
  const pathBtn = toolbarButton('路径', pathValue, function () {
    void pickFilterPath(pathBtn);
  });
  box.appendChild(pathBtn);

  box.appendChild(el('span', 'tb-sep'));

  // 右侧操作：图标与顺序对齐 OpenChamber 面板的工具栏
  box.appendChild(iconButton('refresh', '刷新', function () { void loadAll(); }));
  box.appendChild(iconButton('cherryPick', 'Cherry-pick 选中提交', function () {
    if (!state.selectedCommit) { toast('请先选择提交', true); return; }
    void runCommitAction('cherryPick');
  }));
  const settingsBtn = iconButton('gearSettings', '视图选项', function () {
    void openViewOptions(settingsBtn);
  });
  box.appendChild(settingsBtn);
  box.appendChild(iconButton('search', '跳转到引用', function () { void gotoRef(); }));
}

/**
 * 工具栏开关按钮
 * @param text 按钮文案
 * @param title 提示
 * @param active 是否激活
 * @param onClick 点击处理
 */
function toolbarToggle(text: string, title: string, active: boolean, onClick: () => void): HTMLButtonElement {
  const btn = el('button', 'tb-btn' + (active ? ' active' : ''), text) as HTMLButtonElement;
  btn.title = title;
  btn.onclick = onClick;
  return btn;
}

/**
 * 工具栏过滤按钮
 * @param label 文案
 * @param value 当前过滤值
 * @param onClick 点击处理
 */
function toolbarButton(label: string, value: string | null, onClick: () => void): HTMLButtonElement {
  const btn = el('button', 'tb-btn' + (value ? ' active' : ''), value ? label + ': ' + value : label) as HTMLButtonElement;
  btn.onclick = onClick;
  return btn;
}

/**
 * 渲染提交列表
 */
export function renderCommits(): void {
  const box = document.getElementById('commits');
  if (!box) return;
  box.innerHTML = '';

  const title = el('div', 'section-title');
  title.appendChild(el('span', '', state.selectedBranch ? '提交 · ' + state.selectedBranch : '提交'));
  title.appendChild(el('span', 'spacer'));
  title.appendChild(el('span', '', filterCommits(state.commits).length + ' 条'));
  box.appendChild(title);

  const list = el('div', 'list');
  box.appendChild(list);

  const visible = sortCommits(filterCommits(state.commits));
  // 记录过滤结果，排查「过滤不生效」时直接看这里
  logDebug('panel', 'render_commits', {
    total: state.commits.length,
    visible: visible.length,
    filters: {
      search: state.search,
      regex: state.useRegex,
      caseSensitive: state.caseSensitive,
      branch: state.filterBranch,
      user: state.filterUser,
      dateFrom: state.filterDateFrom,
      dateTo: state.filterDateTo,
      path: state.filterPath,
    },
  });
  updateSearchState();
  if (!visible.length) {
    list.appendChild(el('div', 'empty', state.commits.length ? '没有匹配的提交' : '暂无提交'));
    return;
  }

  const graphRows = calculateGraphRows(visible);

  visible.forEach(function (commit, index) {
    const row = el('div', 'commit-item');
    if (state.selectedCommit === commit.hash) row.classList.add('selected');
    // 图线列
    if (state.showGraph) {
      const graphCell = el('span', 'graph');
      graphCell.innerHTML = graphSvg(graphRows[index]!);
      row.appendChild(graphCell);
    }
    // 列显隐由视图选项控制
    if (state.columns.hash) row.appendChild(el('span', 'hash', commit.shortHash));
    row.appendChild(el('span', 'msg', commit.message.split('\n')[0]!));
    if (state.columns.date) {
      // 日期只取年月日时分，完整时间放 tooltip
      const short = String(commit.date || '').slice(0, 16);
      const dateEl = el('span', 'meta', short);
      dateEl.title = String(commit.date || '');
      row.appendChild(dateEl);
    }
    if (state.columns.author) row.appendChild(el('span', 'meta', commit.authorName));
    row.title = commit.message;
    row.dataset.hash = commit.hash;
    row.onclick = function () {
      state.selectedCommit = commit.hash;
      // 只切换选中样式，不重建列表：重建会把滚动位置重置到顶部
      highlightSelectedCommit();
      void loadDetail(commit.hash);
    };
    list.appendChild(row);
  });
}

/**
 * 只更新提交行的选中样式，避免重建列表导致滚动位置丢失
 */
function highlightSelectedCommit(): void {
  const rows = document.querySelectorAll('.commit-item');
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]! as HTMLElement;
    if (row.dataset.hash === state.selectedCommit) row.classList.add('selected');
    else row.classList.remove('selected');
  }
}

// ---- 过滤下拉 ----

/**
 * 选择过滤分支
 * @param anchor 触发按钮
 */
async function pickFilterBranch(anchor: HTMLButtonElement): Promise<void> {
  const items: Array<{ id: string; label: string; checked?: boolean }> = [{ id: 'all', label: '全部', checked: !state.filterBranch }];
  state.branches.forEach(function (b) {
    items.push({ id: b.name, label: b.name, checked: state.filterBranch === b.name });
  });

  showDropdown(anchor, items, function (id) {
    logDebug('panel', 'filter_branch_selected', { value: id, itemCount: items.length });
    state.filterBranch = id === 'all' ? null : id;
    renderToolbar();
    // 分支过滤需要由 git 重新取历史，不能只在前端筛选已加载的部分
    void loadCommits(state.filterBranch || undefined);
  });
}

/**
 * 选择过滤用户
 * @param anchor 触发按钮
 */
async function pickFilterUser(anchor: HTMLButtonElement): Promise<void> {
  // 作者列表取自已加载提交，去重排序
  const authors: string[] = [];
  state.commits.forEach(function (c) {
    if (c.authorName && authors.indexOf(c.authorName) < 0) authors.push(c.authorName);
  });
  authors.sort();

  const items: Array<{ id: string; label: string; checked?: boolean }> = [{ id: 'all', label: '全部', checked: !state.filterUser }];
  authors.forEach(function (name) {
    items.push({ id: name, label: name, checked: state.filterUser === name });
  });

  showDropdown(anchor, items, function (id) {
    logDebug('panel', 'filter_user_selected', { value: id, authors: items.length - 1 });
    state.filterUser = id === 'all' ? null : id;
    renderToolbar();
    renderCommits();
  });
}

/**
 * 选择日期过滤（相对时间，便于快速定位近期提交）
 * @param anchor 触发按钮
 */
async function pickFilterDate(anchor: HTMLButtonElement): Promise<void> {
  const now = new Date();
  const presets = [
    { id: 'today', label: '今天' },
    { id: 'thisWeek', label: '本周' },
    { id: 'thisMonth', label: '本月' },
    { id: 'thisYear', label: '今年' },
  ];

  const items: Array<{ id: string; label: string; checked?: boolean; kind?: 'separator' }> = [{
    id: 'all',
    label: '全部',
    checked: !state.filterDateFrom && !state.filterDateTo,
  }];
  presets.forEach(function (p) {
    const range = computeDateRange(p.id, now);
    items.push({
      id: p.id,
      label: p.label,
      checked: state.filterDateFrom === range.from && state.filterDateTo === range.to,
    });
  });
  items.push({ id: 'sep', label: '', kind: 'separator' });
  items.push({ id: 'custom', label: '自定义…' });

  showDropdown(anchor, items, function (id) {
    logDebug('panel', 'filter_date_selected', { value: id });
    if (id === 'custom') {
      void pickCustomDateRange();
      return;
    }
    if (id === 'all') {
      state.filterDateFrom = null;
      state.filterDateTo = null;
    } else {
      const range = computeDateRange(id, new Date());
      state.filterDateFrom = range.from;
      state.filterDateTo = range.to;
    }
    renderToolbar();
    renderCommits();
  });
}

/**
 * 选择过滤路径
 * @param anchor 触发按钮
 */
async function pickFilterPath(anchor: HTMLButtonElement): Promise<void> {
  const current = state.filterPath ? [state.filterPath] : [];
  const items: Array<{ id: string; label: string; checked?: boolean; kind?: 'separator' }> = [{ id: 'all', label: '全部', checked: !current.length }];
  // 已选路径作为一条显示，点击可移除
  if (current.length) {
    items.push({ id: 'p:' + current[0]!, label: current[0]!, checked: true });
  }
  items.push({ id: 'sep', label: '', kind: 'separator' });
  items.push({ id: 'pick', label: '选择文件夹…' });
  items.push({ id: 'edit', label: '编辑路径…' });

  showDropdown(anchor, items, function (id) {
    if (id === 'all') {
      state.filterPath = null;
    } else if (id.indexOf('p:') === 0) {
      // 移除已选路径
      state.filterPath = null;
    } else if (id === 'pick') {
      // 选择文件夹：树状勾选，目录整选
      void editPaths(current);
      return;
    } else if (id === 'edit') {
      // 编辑路径：同一棵树，便于逐条调整
      void editPaths(current);
      return;
    }
    renderToolbar();
    void loadCommits(state.filterBranch || undefined);
  });
}

/**
 * 判断提交是否在选定的日期范围内
 * @param dateText 提交时间
 * @returns 是否命中
 */
export function inDateRange(dateText: string): boolean {
  if (!state.filterDateFrom && !state.filterDateTo) return true;
  const time = parseGitDate(dateText);
  if (time === null) return true;

  if (state.filterDateFrom && time < parseGitDate(state.filterDateFrom + ' 00:00:00')!) return false;
  if (state.filterDateTo && time > parseGitDate(state.filterDateTo + ' 23:59:59')!) return false;
  return true;
}

/**
 * 解析 git 时间文本为 UTC 毫秒
 * @param dateText 提交时间文本
 * @returns 毫秒数；无法解析返回 null
 */
export function parseGitDate(dateText: string | null | undefined): number | null {
  const raw = String(dateText || '').trim();
  if (!raw) return null;

  // git 时间格式：2026-01-02 10:00:00 +0800
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2}):(\d{2})/.exec(raw);
  if (!m) return null;

  const utcWall = Date.UTC(
    Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    Number(m[4]), Number(m[5]), Number(m[6]),
  );
  return isNaN(utcWall) ? null : utcWall;
}

/**
 * 按排序模式处理提交
 * @param commits 提交列表
 * @returns 排序后的列表
 */
export function sortCommits<T extends { date: string; authorName: string }>(commits: T[]): T[] {
  const list = commits.slice();
  if (state.sortMode === 'date-desc') {
    list.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  } else if (state.sortMode === 'date-asc') {
    list.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
  } else if (state.sortMode === 'author') {
    list.sort(function (a, b) { return String(a.authorName).localeCompare(String(b.authorName)); });
  }
  return list;
}

/**
 * 跳转到引用
 */
export async function gotoRef(): Promise<void> {
  const value = await showPrompt('跳转到提交哈希或分支', '');
  if (!value) return;
  const hit = state.commits.filter(function (c) {
    return c.hash.indexOf(value) === 0 || c.shortHash === value;
  });
  if (!hit.length) { toast('未找到 ' + value, true); return; }
  state.selectedCommit = hit[0]!.hash;
  renderCommits();
  await loadDetail(hit[0]!.hash);
}

/**
 * 编译搜索条件
 * 正则模式下语法错误会抛错，由调用方标记给用户
 * @returns 匹配函数；无搜索词时返回 null
 */
function buildMatcher(): ((text: string) => boolean) | null {
  const search = state.search || '';
  if (!search) return null;
  if (state.useRegex) {
    // 让非法正则直接抛出，便于在界面上提示，而不是静默返回空结果
    const re = new RegExp(search, state.caseSensitive ? '' : 'i');
    return function (text) {
      // 全局标志会让 test 带状态，这里每次重置
      re.lastIndex = 0;
      return re.test(text);
    };
  }
  const needle = state.caseSensitive ? search : search.toLowerCase();
  return function (text) {
    const haystack = state.caseSensitive ? text : text.toLowerCase();
    return haystack.indexOf(needle) >= 0;
  };
}

/**
 * 按当前条件筛选提交
 * @param commits 原始提交
 * @returns 过滤后的提交
 */
export function filterCommits<T extends { authorName: string; date: string; message: string; hash: string; shortHash: string }>(commits: T[]): T[] {
  const user = state.filterUser || '';

  let match: ((text: string) => boolean) | null = null;
  try {
    match = buildMatcher();
  } catch {
    // 正则非法：本次不按搜索词过滤，错误由 updateSearchState 展示
    match = null;
  }

  return commits.filter(function (c) {
    // 作者过滤
    if (user && (c.authorName || '').toLowerCase().indexOf(user.toLowerCase()) < 0) return false;
    // 日期过滤
    if (!inDateRange(c.date)) return false;
    if (!match) return true;
    return match((c.message || '') + ' ' + (c.hash || '') + ' ' + (c.shortHash || ''));
  });
}

/**
 * 更新搜索框的合法性提示
 * 正则语法错误时标红并给出说明，避免用户以为「搜不到」
 */
export function updateSearchState(): void {
  const search = document.getElementById('commit-search');
  if (!search) return;

  let invalid = false;
  if (state.useRegex && state.search) {
    try {
      new RegExp(state.search, state.caseSensitive ? '' : 'i');
    } catch {
      invalid = true;
    }
  }

  search.classList.toggle('invalid', invalid);
  if (invalid) {
    search.title = '正则表达式语法错误';
    search.setAttribute('aria-invalid', 'true');
  } else {
    search.title = state.search ? '按 Enter 跳到首个匹配，Esc 清空' : '搜索提交信息或哈希';
    search.removeAttribute('aria-invalid');
  }
}

// ---- 提交图 ----

/**
 * 计算每个提交所属图的列
 * 与现有面板同一套算法：按父提交出现顺序分配列，同列沿用颜色
 * @param commits 提交列表
 * @returns 每行的列分配
 */
export function calculateGraphRows<T extends { hash: string; parents?: string[] }>(commits: T[]): Array<{ hash: string; column: number; hasMerge: boolean }> {
  const rows: Array<{ hash: string; column: number; hasMerge: boolean }> = [];
  const columnMap = new Map<string, number>();
  let nextColumn = 0;

  commits.forEach(function (commit) {
    let column;
    if (columnMap.has(commit.hash)) {
      column = columnMap.get(commit.hash)!;
    } else {
      column = nextColumn++;
      columnMap.set(commit.hash, column);
    }

    const parents = commit.parents || [];
    for (let i = 0; i < parents.length; i += 1) {
      const parentHash = parents[i]!;
      if (!columnMap.has(parentHash)) {
        if (i === 0) columnMap.set(parentHash, column);
        else columnMap.set(parentHash, nextColumn++);
      }
    }

    rows.push({ hash: commit.hash, column: column, hasMerge: parents.length > 1 });
  });

  return rows;
}

/**
 * 生成单行图线 SVG
 * @param graphRow 列分配
 * @returns SVG 字符串
 */
export function graphSvg(graphRow: { column: number; hasMerge: boolean }): string {
  // 图线区固定宽度：不随列号变化，保证每行标题起点一致，也不会把标题挤出屏幕
  const colWidth = 10;
  const maxColumns = 4;
  const shownColumn = Math.min(graphRow.column, maxColumns - 1);
  const width = maxColumns * colWidth;
  const x = shownColumn * colWidth + colWidth / 2;
  const color = GRAPH_COLORS[graphRow.column % GRAPH_COLORS.length]!;

  let body = '<svg width="' + width + '" height="20" style="display:block;flex-shrink:0">';
  // 主干竖线
  body += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="20" stroke="' + color + '" stroke-width="1.5"/>';
  // 提交节点
  body += '<circle cx="' + x + '" cy="10" r="3" fill="' + color + '"/>';
  // 合并提交额外画一条分支线，提示存在多个父提交
  if (graphRow.hasMerge) {
    // 合并线限制在 svg 宽度内，超出会被裁掉
    const bx = Math.min(x + colWidth, width - 2);
    body += '<path d="M' + x + ' 10 Q' + bx + ' 10 ' + bx + ' 20" fill="none" stroke="'
      + GRAPH_COLORS[(graphRow.column + 1) % GRAPH_COLORS.length]! + '" stroke-width="1.5"/>';
  }
  body += '</svg>';
  return body;
}

/**
 * 打开视图选项菜单（视图选项与提交列表的显隐/排序耦合，放本模块导出供 sidebar 使用）
 * @param anchor 触发按钮
 */
export async function openViewOptions(anchor: HTMLElement | null): Promise<void> {
  const box = document.getElementById('view-options');
  if (box) { box.remove(); return; }

  const panel = el('div');
  panel.id = 'view-options';
  // 跟随触发按钮定位，避免固定位置离按钮过远
  let top = 48;
  let left = 16;
  if (anchor && anchor.getBoundingClientRect) {
    const rect = anchor.getBoundingClientRect();
    top = Math.round(rect.bottom + 4);
    left = Math.max(8, Math.round(rect.left));
  }
  panel.style.cssText = 'position:fixed;left:' + left + 'px;top:' + top + 'px;z-index:50;'
    + 'background:var(--vscode-menu-background);color:var(--vscode-menu-foreground);'
    + 'border:1px solid var(--vscode-menu-border);border-radius:4px;padding:6px 0;min-width:180px;'
    + 'box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:12px;';

  function section(title: string) {
    const head = el('div', '', title);
    head.style.cssText = 'padding:4px 12px;font-size:11px;color:var(--vscode-descriptionForeground);';
    panel.appendChild(head);
  }

  function checkItem(label: string, checked: boolean, onToggle: () => void) {
    const row = el('div', '', (checked ? '✓ ' : '   ') + label);
    row.style.cssText = 'padding:3px 12px;cursor:pointer;white-space:nowrap;';
    row.onmouseenter = function () { row.style.background = 'var(--vscode-menu-selectionBackground)'; };
    row.onmouseleave = function () { row.style.background = 'transparent'; };
    row.onclick = function () { onToggle(); panel.remove(); };
    panel.appendChild(row);
  }

  section('显示列');
  checkItem('作者', state.columns.author, function () {
    state.columns.author = !state.columns.author;
    renderCommits();
  });
  checkItem('时间', state.columns.date, function () {
    state.columns.date = !state.columns.date;
    renderCommits();
  });
  checkItem('哈希', state.columns.hash, function () {
    state.columns.hash = !state.columns.hash;
    renderCommits();
  });

  checkItem('显示提交图', state.showGraph, function () {
    state.showGraph = !state.showGraph;
    renderCommits();
  });

  section('排序');
  [['default', '默认'], ['date-desc', '日期新→旧'], ['date-asc', '日期旧→新'], ['author', '作者']].forEach(function (pair) {
    checkItem(pair[1]!, state.sortMode === pair[0], function () {
      state.sortMode = pair[0] as typeof state.sortMode;
      renderCommits();
    });
  });

  document.body.appendChild(panel);

  // 点击面板外部关闭
  setTimeout(function () {
    const closer = function (ev: MouseEvent) {
      if (!panel.contains(ev.target as Node)) {
        panel.remove();
        document.removeEventListener('click', closer);
      }
    };
    document.addEventListener('click', closer);
  }, 0);
}
