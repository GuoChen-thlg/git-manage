/**
 * 分支区渲染：renderBranches / renderBranchList 与选中辅助
 * 从 script.ts 原样迁移
 */

import { el } from './dom';
import { state } from './state';
import { loadAll, loadCommits } from './data';
import { renderSidebar } from './render-sidebar';
import {
  toggleFavoriteFor,
  checkoutBranchFlow,
  renameBranchFlow,
  deleteLocalBranchFlow,
  createBranchFromFlow,
  deleteRemoteBranchFlow,
  copyBranchName,
} from './actions';
import { showDropdown, type DropdownItem } from './dialogs';

/**
 * 取当前分支名
 * @returns 分支名或 null
 */
export function currentBranchName(): string | null {
  const current = state.branches.filter(function (b) { return b.isCurrent; });
  return current.length ? current[0]!.name : null;
}

/**
 * 取删除目标列表
 * 多选优先，其次单选；都没有时返回空数组
 * @returns 待删除分支名
 */
export function deleteTargets(): string[] {
  if (state.selectedBranches.size > 0) return Array.from(state.selectedBranches);
  return state.selectedBranch ? [state.selectedBranch] : [];
}

/**
 * 渲染分支区
 */
export function renderBranches(): void {
  const box = document.getElementById('branches');
  if (!box) return;
  box.innerHTML = '';

  const title = el('div', 'section-title');
  title.appendChild(el('span', '', '分支'));
  title.appendChild(el('span', 'spacer'));
  const reload = el('button', '', '刷新');
  reload.onclick = () => { void loadAll(); };
  title.appendChild(reload);
  box.appendChild(title);

  // 分支搜索框（对齐现有面板）
  const searchWrap = el('div', 'branch-search');
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = '搜索分支';
  searchInput.value = state.branchFilter || '';
  searchInput.oninput = function () {
    state.branchFilter = searchInput.value;
    renderBranchList();
  };
  searchWrap.appendChild(searchInput);
  box.appendChild(searchWrap);

  const list = el('div', 'list');
  list.id = 'branch-list';
  box.appendChild(list);
  renderBranchList();
}

/**
 * 按当前筛选条件渲染分支列表
 * 与搜索框分离，避免输入时整个面板重建导致焦点丢失
 */
export function renderBranchList(): void {
  const list = document.getElementById('branch-list');
  if (!list) return;
  list.innerHTML = '';

  const keyword = (state.branchFilter || '').toLowerCase();
  const favorites = state.favorite;

  // 只显示我的分支（对齐现有面板）
  const mySet = state.myBranches;

  /**
   * 判断分支是否通过筛选
   * @param b 分支
   */
  function visible(b: { name: string }) {
    if (keyword && b.name.toLowerCase().indexOf(keyword) < 0) return false;
    if (state.onlyMyBranches && mySet && !mySet.has(b.name)) return false;
    return true;
  }

  if (state.error) {
    list.appendChild(el('div', 'error', state.error));
    return;
  }
  if (!state.branches.length) {
    list.appendChild(el('div', 'empty', '没有分支'));
    return;
  }

  [['local', '本地分支'], ['remote', '远程分支']].forEach(function (pair) {
    const key = pair[0]!;
    const label = pair[1]!;
    const items = state.branches.filter(function (b) {
      return key === 'remote' ? b.isRemote : !b.isRemote;
    });
    const shown = items.filter(visible);
    shown.sort(function (a, b) { return a.name.localeCompare(b.name); });
    if (!shown.length && keyword) return;

    const header = el('div', 'group-header', (state.collapsed[key as 'local' | 'remote'] ? '▸ ' : '▾ ') + label + ' (' + shown.length + ')');
    header.onclick = function () {
      state.collapsed[key as 'local' | 'remote'] = !state.collapsed[key as 'local' | 'remote'];
      renderBranches();
    };
    list.appendChild(header);

    if (state.collapsed[key as 'local' | 'remote']) return;

    shown.forEach(function (branch) {
      const row = el('div', 'branch-item');
      if (branch.isCurrent) row.classList.add('current');
      if (state.selectedBranch === branch.name || state.selectedBranches.has(branch.name)) {
        row.classList.add('selected');
      }
      if (branch.isCurrent) row.appendChild(el('span', 'dot', '●'));
      // 收藏星标：点击切换收藏，不触发分支选中
      const star = el('span', 'star' + (favorites.has(branch.name) ? ' on' : ''), favorites.has(branch.name) ? '★' : '☆');
      star.title = favorites.has(branch.name) ? '取消收藏' : '收藏';
      star.onclick = function (ev) {
        ev.stopPropagation();
        void toggleFavoriteFor(branch.name);
      };
      row.appendChild(star);
      row.appendChild(el('span', 'name', branch.name));
      row.title = branch.message || branch.name;
      row.onclick = function (ev) {
        // Cmd/Ctrl 点击累加选择，与现有面板和 IDEA 一致
        const multi = ev && (ev.metaKey || ev.ctrlKey);
        if (multi) {
          if (state.selectedBranches.has(branch.name)) state.selectedBranches.delete(branch.name);
          else state.selectedBranches.add(branch.name);
          // 多选时不切换提交列表；仅剩一个时仍作为主选中分支
          const names = Array.from(state.selectedBranches);
          state.selectedBranch = names.length === 1 ? names[0]! : null;
          renderSidebar();
          renderBranchList();
          return;
        }

        // 普通点击：单选，清空多选
        state.selectedBranches = new Set();
        state.selectedBranch = branch.name;
        // 图标列的可用态依赖选中分支，选中后需同步刷新
        renderSidebar();
        renderBranches();
        void loadCommits(branch.name);
      };
      // 右键菜单：对齐 IDEA 分支操作，按本地/远程区分可用项
      row.oncontextmenu = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        showBranchContextMenu(row, branch, ev);
      };
      list.appendChild(row);
    });
  });
}

/**
 * 分支项右键菜单
 * 对齐 IDEA 分支操作：本地与远程分支展示不同可用项。
 * @param anchor 触发行（用于去重与默认定位）
 * @param branch 分支数据
 * @param ev 右键事件，提供鼠标坐标
 */
function showBranchContextMenu(
  anchor: HTMLElement,
  branch: { name: string; isCurrent?: boolean; isRemote?: boolean },
  ev: MouseEvent,
): void {
  const items: DropdownItem[] = [];

  if (!branch.isRemote) {
    // 本地分支
    items.push({
      id: 'checkout',
      label: '切换分支',
      disabled: branch.isCurrent,
    });
    items.push({
      id: 'createFrom',
      label: '基于该分支新建',
    });
    items.push({
      id: 'rename',
      label: '重命名',
      disabled: branch.isCurrent,
    });
    items.push({ kind: 'separator', id: 'sep1', label: '' });
    items.push({
      id: 'delete',
      label: '删除',
      disabled: branch.isCurrent,
    });
  } else {
    // 远程分支
    items.push({
      id: 'createFrom',
      label: '基于该远程分支新建本地分支',
    });
    items.push({
      id: 'deleteRemote',
      label: '删除远程分支',
    });
  }

  items.push({ kind: 'separator', id: 'sepCopy', label: '' });
  items.push({ id: 'copy', label: '复制分支名' });

  showDropdown(anchor, items, function (id) {
    if (id === 'checkout') void checkoutBranchFlow(branch.name);
    else if (id === 'createFrom') void createBranchFromFlow(branch.name);
    else if (id === 'rename') void renameBranchFlow(branch.name);
    else if (id === 'delete') void deleteLocalBranchFlow(branch.name);
    else if (id === 'deleteRemote') void deleteRemoteBranchFlow(branch.name);
    else if (id === 'copy') void copyBranchName(branch.name);
  }, { x: ev.clientX, y: ev.clientY });
}
