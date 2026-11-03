/**
 * 日期与路径过滤器：预设区间、自定义日期对话框、路径树勾选
 * 从 script.ts 原样迁移
 */

import { el, logDebug, logError } from './dom';
import { state } from './state';
import { toast } from './dialogs';
import { call } from './messaging';
import { renderToolbar, renderCommits } from './render-commits';
import { loadCommits } from './data';

/**
 * 计算日期预设区间
 * @param preset 预设标识
 * @param now 当前时间
 * @returns 起止日期（YYYY-MM-DD）
 */
export function computeDateRange(preset: string, now: Date): { from: string; to: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  let start: Date;
  let end: Date;

  if (preset === 'today') {
    start = new Date(y, m, d);
    end = new Date(y, m, d);
  } else if (preset === 'thisWeek') {
    // 周一为一周起点
    const offset = (now.getDay() + 6) % 7;
    start = new Date(y, m, d - offset);
    end = new Date(y, m, d - offset + 6);
  } else if (preset === 'thisMonth') {
    start = new Date(y, m, 1);
    end = new Date(y, m + 1, 0);
  } else {
    start = new Date(y, 0, 1);
    end = new Date(y, 11, 31);
  }

  const fmt = function (dt: Date) {
    return dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + dt.getDate()).slice(-2);
  };
  return { from: fmt(start), to: fmt(end) };
}

/**
 * 自定义日期范围：用原生日期选择器，不用文本输入
 * @returns 完成后 resolve
 */
export function pickCustomDateRange(): Promise<null> {
  return new Promise(function (resolve) {
    const overlay = el('div', 'dlg-overlay');
    const box = el('div', 'dlg-box');
    box.appendChild(el('div', 'dlg-message', '自定义日期范围'));

    /**
     * 创建一行日期输入
     * @param label 标签
     * @param value 初始值
     */
    function dateRow(label: string, value: string | null) {
      const wrap = el('div', 'dlg-field');
      wrap.appendChild(el('div', 'dlg-field-label', label));
      const input = document.createElement('input');
      // 原生日期控件，点击弹出日历，避免手输格式错误
      input.type = 'date';
      input.className = 'dlg-date';
      input.value = value || '';
      wrap.appendChild(input);
      box.appendChild(wrap);
      return input;
    }

    const fromInput = dateRow('起始日期', state.filterDateFrom);
    const toInput = dateRow('结束日期', state.filterDateTo);

    const actions = el('div', 'dlg-actions');
    const clear = el('button', 'dlg-btn', '清除');
    const cancel = el('button', 'dlg-btn', '取消');
    const ok = el('button', 'dlg-btn primary', '确定');
    actions.appendChild(clear);
    actions.appendChild(cancel);
    actions.appendChild(ok);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function finish(from: string | null, to: string | null) {
      overlay.remove();
      state.filterDateFrom = from;
      state.filterDateTo = to;
      logDebug('panel', 'date_range_applied', { from: from, to: to });
      renderToolbar();
      renderCommits();
      resolve(null);
    }

    clear.onclick = function () { finish(null, null); };
    cancel.onclick = function () { overlay.remove(); resolve(null); };
    ok.onclick = function () {
      const from = fromInput.value || null;
      const to = toInput.value || null;
      // 区间倒置时自动交换，避免静默无结果
      if (from && to && from > to) finish(to, from);
      else finish(from, to);
    };
    overlay.onclick = function (ev) {
      if (ev.target === overlay) { overlay.remove(); resolve(null); }
    };
  });
}

/**
 * 打开路径树勾选对话框（入口：读取文件列表后建树）
 * @param current 当前已选路径
 */
export async function editPaths(current: string[]): Promise<void> {
  let files: string[] = [];
  try {
    files = await call<string[]>('listFiles');
  } catch (err) {
    logError('panel', 'list_files_failed', { error: String(err) });
    toast('读取文件列表失败：' + (err instanceof Error ? err.message : err), true);
    return;
  }
  if (!files || !files.length) {
    toast('仓库中没有可过滤的文件', true);
    return;
  }
  openPathTree(files, current);
}

/** 路径树节点 */
interface PathNode {
  path: string;
  name: string;
  isDir: boolean;
  children: PathNode[];
}

/**
 * 由文件列表构建目录树
 * @param files 文件路径列表
 * @returns 根节点
 */
export function buildPathTree(files: string[]): PathNode[] {
  const roots: PathNode[] = [];
  const byPath: Record<string, PathNode> = {};

  files.forEach(function (file) {
    if (!file) return;
    const segments = file.split('/');
    let parent: PathNode | null = null;
    let currentPath = '';

    segments.forEach(function (segment, index) {
      if (!segment) return;
      currentPath = currentPath ? currentPath + '/' + segment : segment;
      const isLast = index === segments.length - 1;

      let node = byPath[currentPath];
      if (!node) {
        node = { path: currentPath, name: segment, isDir: !isLast, children: [] };
        byPath[currentPath] = node;
        if (parent) parent.children.push(node);
        else roots.push(node);
      }
      parent = node;
    });
  });

  // 目录在前，同级按名称排序
  function sortNodes(nodes: PathNode[]) {
    nodes.sort(function (a, b) {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(function (n) { sortNodes(n.children); });
  }
  sortNodes(roots);
  return roots;
}

/**
 * 路径树勾选对话框
 * @param files 已跟踪文件
 * @param current 当前已选路径
 */
export function openPathTree(files: string[], current: string[]): void {
  const roots = buildPathTree(files);
  // 单选：只保留一个已选路径（与 IDEA 一致）
  let selectedPath: string | null = current[0] || null;
  // 顶层目录默认展开一层
  const expanded = new Set(roots.filter(function (n) { return n.isDir; }).map(function (n) { return n.path; }));

  const overlay = el('div', 'dlg-overlay');
  const box = el('div', 'dlg-box wide');
  box.appendChild(el('div', 'dlg-message', '选择要过滤的路径'));

  const tree = el('div', 'ptree');
  box.appendChild(tree);

  const hint = el('div', 'dlg-hint');
  box.appendChild(hint);

  const actions = el('div', 'dlg-actions');
  const clear = el('button', 'dlg-btn', '清除');
  const cancel = el('button', 'dlg-btn', '取消');
  const ok = el('button', 'dlg-btn primary', '确定');
  actions.appendChild(clear);
  actions.appendChild(cancel);
  actions.appendChild(ok);
  box.appendChild(actions);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function updateHint() {
    hint.textContent = selectedPath ? '已选：' + selectedPath : '未选择（未选则不过滤）';
  }

  function renderTree() {
    tree.innerHTML = '';

    function renderNodes(nodes: PathNode[], depth: number) {
      nodes.forEach(function (node) {
        const row = el('div', 'ptree-row');
        row.style.paddingLeft = (8 + depth * 14) + 'px';

        // 目录可展开
        if (node.isDir) {
          const arrow = el('span', 'ptree-arrow', expanded.has(node.path) ? '▾' : '▸');
          arrow.onclick = function (ev) {
            ev.stopPropagation();
            if (expanded.has(node.path)) expanded.delete(node.path);
            else expanded.add(node.path);
            renderTree();
          };
          row.appendChild(arrow);
        } else {
          row.appendChild(el('span', 'ptree-arrow', ''));
        }

        const check = el('span', 'ptree-check', selectedPath === node.path ? '✓' : '');
        row.appendChild(check);
        row.appendChild(el('span', 'ptree-name' + (node.isDir ? ' dir' : ''), node.name));

        row.onclick = function () {
          // 单选：再次点击已选项则取消，否则替换为新选项
          selectedPath = selectedPath === node.path ? null : node.path;
          renderTree();
        };

        tree.appendChild(row);

        if (node.isDir && expanded.has(node.path) && node.children.length) {
          renderNodes(node.children, depth + 1);
        }
      });
    }

    renderNodes(roots, 0);
    updateHint();
  }

  renderTree();

  clear.onclick = function () {
    selectedPath = null;
    renderTree();
  };
  cancel.onclick = function () {
    overlay.remove();
  };
  ok.onclick = function () {
    overlay.remove();
    state.filterPath = selectedPath;
    logDebug('panel', 'filter_path_applied', { path: selectedPath });
    renderToolbar();
    void loadCommits(state.filterBranch || undefined);
  };
  overlay.onclick = function (ev) {
    if (ev.target === overlay) overlay.remove();
  };
}
