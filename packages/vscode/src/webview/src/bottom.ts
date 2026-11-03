/**
 * 底部页签：Git / 控制台 / Worktrees
 * 从 script.ts 原样迁移
 */

import { el } from './dom';
import { state } from './state';
import { toast, showPrompt, showConfirm } from './dialogs';
import { call } from './messaging';

/** 底部页签定义 */
const BOTTOM_TABS = [
  { key: 'git', label: 'Git' },
  { key: 'console', label: '控制台' },
  { key: 'worktrees', label: 'Worktrees' },
];

/**
 * 渲染底部页签区
 */
export function renderBottom(): void {
  const box = document.getElementById('bottom');
  if (!box) return;
  box.innerHTML = '';

  const tabs = el('div');
  tabs.id = 'bottom-tabs';
  BOTTOM_TABS.forEach(function (tab) {
    const node = el('div', 'tab' + (state.bottomTab === tab.key ? ' active' : ''), tab.label);
    node.onclick = function () {
      // 再次点击已激活页签则收起，与现有面板一致
      state.bottomTab = state.bottomTab === tab.key ? null : tab.key;
      renderBottom();
    };
    tabs.appendChild(node);
  });
  box.appendChild(tabs);

  const body = el('div');
  body.id = 'bottom-body';
  if (state.bottomTab) body.classList.add('open');
  box.appendChild(body);

  if (state.bottomTab === 'console') void renderConsole(body);
  if (state.bottomTab === 'worktrees') void renderWorktrees(body);
}

/**
 * 控制台：git 命令日志
 * @param box 容器
 */
async function renderConsole(box: HTMLElement): Promise<void> {
  box.innerHTML = '';
  const head = el('div', 'section-title');
  head.appendChild(el('span', '', 'git 命令日志'));
  head.appendChild(el('span', 'spacer'));
  const clear = el('button', '', '清空');
  clear.onclick = function () {
    void (async function () {
      try {
        await call('clearCommandLogs');
        state.commandLogs = [];
        renderBottom();
      } catch (err) {
        toast('清空失败：' + ((err as Error).message || err), true);
      }
    })();
  };
  head.appendChild(clear);
  box.appendChild(head);

  let logs = state.commandLogs;
  if (!logs.length) {
    try {
      logs = await call<typeof state.commandLogs>('getCommandLogs', { since: 0 });
      state.commandLogs = logs || [];
    } catch (err) {
      box.appendChild(el('div', 'error', '读取命令日志失败：' + ((err as Error).message || err)));
      return;
    }
  }

  if (!state.commandLogs.length) {
    box.appendChild(el('div', 'empty', '暂无 git 命令'));
    return;
  }

  const list = el('div', 'cmd-list');
  // 新命令在上，便于直接看到最近一次操作
  state.commandLogs.slice().reverse().forEach(function (logEntry) {
    const row = el('div', 'cmd-row');
    const ok = logEntry.ok !== false;
    row.appendChild(el('span', 'cmd-status' + (ok ? '' : ' fail'), ok ? '✓' : '✗'));
    row.appendChild(el('span', 'cmd-text', logEntry.command));
    row.appendChild(el('span', 'cmd-meta', (logEntry.durationMs || 0) + 'ms'));
    row.title = (logEntry.stderr || logEntry.stdout || '').slice(0, 500);
    list.appendChild(row);
  });
  box.appendChild(list);
}

/**
 * Worktrees 列表
 * @param box 容器
 */
async function renderWorktrees(box: HTMLElement): Promise<void> {
  box.innerHTML = '';
  const head = el('div', 'section-title');
  head.appendChild(el('span', '', 'Worktrees'));
  head.appendChild(el('span', 'spacer'));

  const addBtn = el('button', '', '新建');
  addBtn.onclick = function () { void addWorktreeFlow(); };
  head.appendChild(addBtn);

  const pruneBtn = el('button', '', '清理失效项');
  pruneBtn.onclick = function () { void pruneWorktreesFlow(); };
  head.appendChild(pruneBtn);
  box.appendChild(head);

  let list;
  try {
    list = await call<typeof state.worktrees>('listWorktrees');
    state.worktrees = list || [];
  } catch (err) {
    box.appendChild(el('div', 'error', '读取 worktree 失败：' + ((err as Error).message || err)));
    return;
  }

  if (!state.worktrees.length) {
    box.appendChild(el('div', 'empty', '没有 worktree'));
    return;
  }

  const wrap = el('div', 'wt-list');
  state.worktrees.forEach(function (wt) {
    const row = el('div', 'wt-row');
    row.appendChild(el('span', 'wt-path', wt.path));
    if (wt.branch) {
      // git 返回 refs/heads/xxx 形式，展示时去掉前缀
      row.appendChild(el('span', 'wt-branch', String(wt.branch).replace('refs/heads/', '')));
    }
    if (wt.isMain) row.appendChild(el('span', 'wt-main', '主工作区'));

    if (!wt.isMain) {
      const remove = el('button', '', '移除');
      remove.onclick = function () { void removeWorktreeFlow(wt.path); };
      row.appendChild(remove);
    }
    wrap.appendChild(row);
  });
  box.appendChild(wrap);
}

/**
 * 新建 worktree
 */
async function addWorktreeFlow(): Promise<void> {
  const path = await showPrompt('新 worktree 的目标路径', '');
  if (!path) return;
  const branch = await showPrompt('绑定的分支名', '');
  if (!branch) return;
  try {
    await call('addWorktree', { path: path, branchName: branch });
    toast('已创建 worktree');
    state.worktrees = [];
    renderBottom();
  } catch (err) {
    toast('创建 worktree 失败：' + ((err as Error).message || err), true);
  }
}

/**
 * 移除 worktree
 * @param path 路径
 */
async function removeWorktreeFlow(path: string): Promise<void> {
  const ok = await showConfirm('移除 worktree ' + path + '？');
  if (!ok) return;
  try {
    await call('removeWorktree', { path: path });
    toast('已移除 worktree');
    state.worktrees = [];
    renderBottom();
  } catch (err) {
    toast('移除失败：' + ((err as Error).message || err), true);
  }
}

/**
 * 清理失效项
 */
async function pruneWorktreesFlow(): Promise<void> {
  try {
    await call('pruneWorktrees');
    toast('已清理失效项');
    state.worktrees = [];
    renderBottom();
  } catch (err) {
    toast('清理失败：' + ((err as Error).message || err), true);
  }
}
