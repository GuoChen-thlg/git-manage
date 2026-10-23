/**
 * 分支面板组件
 * 交互参考 IntelliJ 分支面板
 * 支持树状分组结构
 */

import { html } from '../html';
import { getState, setState, subscribeFields, Branch } from '../state';
import { ServiceClient } from '../service';
import { getIcon } from '../icons';
import { t } from '../i18n';
import { showContextMenu } from './context-menu';

/**
 * 创建分支面板
 * @param container 挂载容器
 * @param service 服务客户端（右键菜单操作使用）
 * @param directory 当前仓库目录
 * @param onBranchSelect 点击分支项回调：由 main 负责拉取该分支提交并设置分支过滤
 * @param onSelectionCleared 点击列表空白区域的取消选中回调（对齐 IntelliJ IDEA：
 *   分支面板存在选中分支 selectedBranch 或分支过滤 logBranch 时点击空白触发，
 *   由 main 清空选中态并恢复全部提交；两者都不存在时空操作不触发）
 * @returns 面板句柄（dispose 取消订阅、expandAll 展开全部分组）
 */
export function createBranchPanel(
  container: HTMLElement,
  service: ServiceClient,
  directory: string,
  onBranchSelect: (branch: Branch) => void,
  onSelectionCleared: () => void
): { dispose: () => void; expandAll: () => void } {
  let disposed = false;
  let listContainer: HTMLElement | null = null;
  const expandedGroups = new Set<string>(['HEAD(当前分支)', '本地']);
  let unsubscribe: (() => void) | null = null;

  const findBranchFromEvent = (e: Event): Branch | null => {
    const target = e.target as HTMLElement;
    const item = target.closest('[data-branch]');
    if (!item) return null;
    const branchName = item.getAttribute('data-branch');
    if (!branchName) return null;
    const state = getState();
    const branch = state.branches.find(b => b.name === branchName) || null;
    if (!branch) {
      console.error(JSON.stringify({
        prefix: '[branch-panel]',
        event: 'branch_not_found',
        branchName,
        availableCount: state.branches.length,
        targetTag: target.tagName,
      }));
    }
    return branch;
  };

  const findGroupFromEvent = (e: Event): string | null => {
    const target = e.target as HTMLElement;
    const item = target.closest('[data-group]');
    if (!item) return null;
    return item.getAttribute('data-group');
  };

  const render = () => {
    if (disposed) return;
    container.innerHTML = '';

    // 搜索框
    const searchContainer = html`
      <div style="padding: 4px 6px; border-bottom: 1px solid #333; flex-shrink: 0;">
        <div style="display: flex; align-items: center; background: #2a2a2a; border: 1px solid #444; border-radius: 3px; padding: 0 6px;">
          <span style="color: #888; font-size: 12px; margin-right: 4px;">${getIcon('search')}</span>
          <input 
            type="text" 
            placeholder="${t('branch.searchPlaceholder')}" 
            style="flex: 1; padding: 4px 0; background: transparent; border: none; color: #ccc; font-size: 12px; outline: none;"
          />
        </div>
      </div>
    `;

    const searchInput = searchContainer.querySelector('input') as HTMLInputElement;
    searchInput.value = getState().branchFilter;
    searchInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      setState(s => { s.branchFilter = target.value; });
      // 订阅回调会触发 renderList，此处无需重复调用
    });
    container.appendChild(searchContainer);

    // 分支列表
    listContainer = html`
      <div style="flex: 1; overflow-y: auto; overflow-x: hidden;"></div>
    `;

    listContainer.addEventListener('click', (e) => {
      // 先处理分支选择（分支项可能嵌套在分组结构内，需优先匹配）
      const branch = findBranchFromEvent(e);
      if (branch) {
        console.debug(JSON.stringify({
          prefix: '[branch-panel]',
          event: 'branch_click',
          branchName: branch.name,
        }));
        // 先触发选择回调，再更新选中态（避免订阅回调异常阻断加载）
        try {
          console.debug(JSON.stringify({ prefix: '[branch-panel]', event: 'before_on_branch_select', branchName: branch.name }));
          onBranchSelect(branch);
          console.debug(JSON.stringify({ prefix: '[branch-panel]', event: 'after_on_branch_select', branchName: branch.name }));
        } catch (err) {
          console.error(JSON.stringify({ prefix: '[branch-panel]', event: 'on_branch_select_error', error: String(err) }));
        }
        setState(s => { s.selectedBranch = branch; });
        return;
      }

      // 再处理分组折叠/展开
      const groupEl = findGroupFromEvent(e);
      if (groupEl) {
        console.debug(JSON.stringify({
          prefix: '[branch-panel]',
          event: 'group_click',
          groupName: groupEl,
        }));
        if (expandedGroups.has(groupEl)) {
          expandedGroups.delete(groupEl);
        } else {
          expandedGroups.add(groupEl);
        }
        renderList();
        // 分组点击不落入下方的空白清除逻辑
        return;
      }

      // 空白区域点击（既非分支也非分组）：对齐 IntelliJ IDEA，
      // 存在选中分支或分支过滤时触发清除回调；清除动作（改 state + 重新拉数据）由 main 统一实现
      const state = getState();
      if (state.selectedBranch || state.logBranch) {
        console.debug(JSON.stringify({ prefix: '[branch-panel]', event: 'blank_clear' }));
        onSelectionCleared();
      } else {
        console.debug(JSON.stringify({ prefix: '[branch-panel]', event: 'blank_clear_noop' }));
      }
    });

    listContainer.addEventListener('contextmenu', (e) => {
      const branch = findBranchFromEvent(e);
      if (branch) {
        e.preventDefault();
        showContextMenu(e, branch, service, directory);
      }
    });

    container.appendChild(listContainer);
    renderList();

    // 订阅状态字段，变化时局部更新分支列表
    if (unsubscribe) unsubscribe();
    unsubscribe = subscribeFields(
      ['branches', 'branchFilter', 'favorites', 'selectedBranch'],
      () => {
        if (!disposed) renderList();
      }
    );
  };

  const renderList = () => {
    if (disposed || !listContainer) return;
    const state = getState();
    listContainer.innerHTML = '';

    const filteredBranches = state.branches.filter(branch => {
      if (!state.branchFilter) return true;
      return branch.name.toLowerCase().includes(state.branchFilter.toLowerCase());
    });

    const current = filteredBranches.filter(b => b.isCurrent);
    const local = filteredBranches.filter(b => !b.isCurrent && !b.isRemote);
    const remote = filteredBranches.filter(b => b.isRemote);

    // HEAD(当前分支)
    if (current.length > 0) {
      listContainer.appendChild(
        createGroup('HEAD(当前分支)', current, expandedGroups.has('HEAD(当前分支)'))
      );
    }

    // 本地分支 - 按文件夹分组
    if (local.length > 0) {
      const groups = groupBranches(local);
      const localGroup = createCollapsibleGroup('本地', groups);
      listContainer.appendChild(localGroup);
    }

    // 远程分支
    if (remote.length > 0) {
      listContainer.appendChild(
        createGroup('远程', remote, expandedGroups.has('远程'))
      );
    }
  };

  /**
   * 展开全部可折叠分组：HEAD(当前分支)/本地/远程 三大分组，
   * 以及"本地"分组内由 createCollapsibleGroup 渲染的文件夹分组
   * （文件夹 key 与 groupBranches 一致，取分支名第一段）
   * dispose 后调用为安全空操作
   */
  const expandAll = () => {
    if (disposed) return;
    expandedGroups.add('HEAD(当前分支)');
    expandedGroups.add('本地');
    expandedGroups.add('远程');
    for (const branch of getState().branches) {
      const parts = branch.name.split('/');
      if (parts.length > 1) {
        expandedGroups.add(parts[0]);
      }
    }
    console.debug(JSON.stringify({
      prefix: '[branch-panel]',
      event: 'expand_all',
      groupCount: expandedGroups.size,
    }));
    renderList();
  };

  const dispose = () => {
    disposed = true;
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
  render();
  return { dispose, expandAll };

  /** 按文件夹名分组分支 */
  function groupBranches(branches: Branch[]): Map<string, Branch[]> {
    const groups = new Map<string, Branch[]>();
    const rootBranches: Branch[] = [];

    for (const branch of branches) {
      const parts = branch.name.split('/');
      if (parts.length > 1) {
        const folderName = parts[0];
        if (!groups.has(folderName)) {
          groups.set(folderName, []);
        }
        groups.get(folderName)!.push(branch);
      } else {
        rootBranches.push(branch);
      }
    }

    // 根分支放在最前面
    const result = new Map<string, Branch[]>();
    for (const branch of rootBranches) {
      const key = branch.name;
      result.set(key, [branch]);
    }

    // 文件夹分组
    for (const [folder, branchList] of groups) {
      result.set(folder, branchList);
    }

    return result;
  }

  /** 创建可折叠分组 */
  function createCollapsibleGroup(title: string, groups: Map<string, Branch[]>): HTMLElement {
    const isExpanded = expandedGroups.has(title);

    const groupEl = html`
      <div style="margin-bottom: 2px;">
        <div data-group="${title}" style="display: flex; align-items: center; padding: 4px 8px; font-size: 11px; color: #888; cursor: pointer; user-select: none;">
          <span style="margin-right: 4px; font-size: 8px;">${isExpanded ? '▼' : '▶'}</span>
          ${title}
        </div>
      </div>
    `;

    if (isExpanded) {
      for (const [key, branches] of groups) {
        if (branches.length === 1 && key === branches[0].name) {
          // 单个分支
          groupEl.appendChild(createBranchItem(branches[0]));
        } else {
          // 文件夹分组
          const folderExpanded = expandedGroups.has(key);
          const folderEl = html`
            <div style="margin-left: 12px;">
              <div data-group="${key}" style="display: flex; align-items: center; padding: 3px 8px; font-size: 11px; color: #888; cursor: pointer; user-select: none;">
                <span style="margin-right: 4px; font-size: 8px;">${folderExpanded ? '▼' : '▶'}</span>
                ${key}
              </div>
            </div>
          `;

          if (folderExpanded) {
            for (const branch of branches) {
              const branchItem = createBranchItem(branch);
              branchItem.style.paddingLeft = '32px';
              folderEl.appendChild(branchItem);
            }
          }

          groupEl.appendChild(folderEl);
        }
      }
    }

    return groupEl;
  }

  /** 创建简单分组 (HEAD, 远程) */
  function createGroup(title: string, branches: Branch[], expanded: boolean): HTMLElement {
    const group = html`
      <div style="margin-bottom: 2px;">
        <div data-group="${title}" style="display: flex; align-items: center; padding: 4px 8px; font-size: 11px; color: #888; cursor: pointer; user-select: none;">
          <span style="margin-right: 4px; font-size: 8px;">${expanded ? '▼' : '▶'}</span>
          ${title}
        </div>
      </div>
    `;

    if (expanded) {
      for (const branch of branches) {
        group.appendChild(createBranchItem(branch));
      }
    }

    return group;
  }

  function createBranchItem(branch: Branch): HTMLElement {
    const state = getState();
    const isFavorite = state.favorites.has(branch.name);
    // 选中态：点击的分支（区别于 HEAD 当前分支）
    const isSelected = state.selectedBranch?.name === branch.name;
    const bgStyle = isSelected
      ? 'background: #2e4a6e;'
      : branch.isCurrent
        ? 'background: #2a3a4a;'
        : '';

    return html`
      <div 
        style="display: flex; align-items: center; padding: 3px 8px 3px 20px; cursor: pointer; font-size: 12px; ${bgStyle}"
        data-branch="${branch.name}"
      >
        <span style="margin-right: 6px; flex-shrink: 0;">${getIcon('branchIcon')}</span>
        ${isFavorite ? `<span style="margin-right: 4px; color: #f4af3d; font-size: 10px;">★</span>` : ''}
        <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${branch.isCurrent ? 'font-weight: bold; color: #fff;' : 'color: #ccc;'}">${branch.name}</span>
        ${branch.hasUnpushed && branch.unpushedCount ? `<span style="font-size: 10px; color: #4caf50; margin-left: 4px;">↑${branch.unpushedCount}</span>` : ''}
        ${branch.hasUnpulled && branch.unpulledCount ? `<span style="font-size: 10px; color: #589df6; margin-left: 4px;">↓${branch.unpulledCount}</span>` : ''}
      </div>
    `;
  }
}
