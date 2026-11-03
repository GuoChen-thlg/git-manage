/**
 * 左侧图标列：SIDEBAR_ITEMS、iconButton、renderSidebar 及相关动作
 * 从 script.ts 原样迁移
 */

import { el } from './dom';
import { state } from './state';
import { iconSvg } from './icons';
import { toast } from './dialogs';
import { loadCommits } from './data';
import { renderBranches, currentBranchName, deleteTargets } from './render-branches';
import { openViewOptions } from './render-commits';
import { createBranchFlow, deleteBranchFlow, remoteAction, toggleFavorite, toggleMyBranches } from './actions';

/** 侧栏图标项 */
interface SidebarItem {
  key: string;
  icon: string;
  title: string;
  action: string;
}

/** 侧栏图标项定义：与现有面板一致，顺序对齐 IDEA 分支面板工具栏 */
export const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: 'hideBranches', icon: 'hideBranches', title: '收起分支面板', action: 'toggleBranchPanel' },
  { key: 'newBranch', icon: 'newBranch', title: '新建分支', action: 'newBranch' },
  { key: 'update', icon: 'updateSelected', title: '更新所选', action: 'updateSelected' },
  { key: 'delete', icon: 'deleteBranch', title: '删除分支', action: 'deleteBranch' },
  { key: 'compare', icon: 'compareBranch', title: '分支比较', action: 'compareBranch' },
  { key: 'myBranches', icon: 'search', title: '只显示我的分支', action: 'toggleMyBranches' },
  { key: 'fetch', icon: 'fetch', title: '获取远程更新', action: 'fetch' },
  { key: 'favorite', icon: 'favoriteOutline', title: '收藏分支', action: 'toggleFavorite' },
  { key: 'locate', icon: 'locate', title: '定位当前分支', action: 'locateCurrent' },
  { key: 'settings', icon: 'settings', title: '设置', action: 'settings' },
  { key: 'expandAll', icon: 'expandAll', title: '展开全部', action: 'expandAll' },
  { key: 'collapseAll', icon: 'collapseAll', title: '折叠全部', action: 'collapseAll' },
];

/**
 * 创建图标按钮
 * @param name 图标名
 * @param title 悬停提示
 * @param onClick 点击处理
 */
export function iconButton(name: string, title: string, onClick: () => void): HTMLButtonElement {
  const btn = el('button', 'icon-btn') as HTMLButtonElement;
  btn.innerHTML = iconSvg(name);
  btn.title = title;
  btn.setAttribute('aria-label', title);
  btn.onclick = onClick;
  return btn;
}

/**
 * 渲染左侧图标列
 */
export function renderSidebar(): void {
  const box = document.getElementById('sidebar');
  if (!box) return;
  box.innerHTML = '';

  SIDEBAR_ITEMS.forEach(function (item) {
    // 收起/展开按钮随分支面板显隐切换图标
    let iconName = item.icon;
    if (item.action === 'toggleBranchPanel') {
      // 与 OpenChamber 一致：展开态用右箭头，收起态用左箭头
      iconName = state.branchPanelHidden ? 'showBranches' : 'hideBranches';
    }
    // 收藏图标随状态切换实心/空心，与 OpenChamber 一致
    if (item.action === 'toggleFavorite') {
      const target = state.selectedBranch || currentBranchName();
      iconName = target && state.favorite.has(target) ? 'favorite' : 'favoriteOutline';
    }
    const btn = iconButton(iconName, item.title, function () {
      // 把触发按钮传下去，菜单据此定位
      void runSidebarAction(item.action, btn);
    });
    if (item.action === 'toggleBranchPanel') {
      btn.title = state.branchPanelHidden ? '展开分支面板' : '收起分支面板';
    }
    if (item.action === 'locateCurrent' && !currentBranchName()) {
      btn.disabled = true;
    }
    // 目标为空或包含当前分支时不可删除，与 IDEA 动作置灰一致
    if (item.action === 'deleteBranch') {
      const targets = deleteTargets();
      const current = currentBranchName();
      btn.disabled = targets.length === 0 || (current !== null && targets.indexOf(current) >= 0);
    }
    box.appendChild(btn);
  });
}

/**
 * 执行图标列动作
 * @param action 动作标识
 * @param anchor 触发按钮（菜单定位用）
 */
export async function runSidebarAction(action: string, anchor?: HTMLButtonElement): Promise<void> {
  switch (action) {
    case 'toggleBranchPanel':
      state.branchPanelHidden = !state.branchPanelHidden;
      {
        const branches = document.getElementById('branches');
        if (branches) branches.style.display = state.branchPanelHidden ? 'none' : '';
      }
      renderSidebar();
      return;
    case 'newBranch':
      await createBranchFlow();
      return;
    case 'deleteBranch':
      await deleteBranchFlow();
      return;
    case 'fetch':
      await remoteAction('fetch');
      return;
    case 'updateSelected':
      await remoteAction('pull');
      return;
    case 'toggleFavorite':
      await toggleFavorite();
      return;
    case 'toggleMyBranches':
      await toggleMyBranches();
      return;
    case 'locateCurrent': {
      const current = currentBranchName();
      if (current) {
        state.selectedBranch = current;
        renderBranches();
        await loadCommits(current);
      }
      return;
    }
    case 'settings':
      // 左侧设置图标与工具栏的视图选项入口一致
      await openViewOptions(anchor ?? null);
      return;
    case 'compareBranch':
      toast('分支比较正在补齐中');
      return;
    case 'expandAll':
    case 'collapseAll': {
      const collapse = action === 'collapseAll';
      state.collapsed.local = collapse;
      state.collapsed.remote = collapse;
      renderBranches();
      return;
    }
    default:
      // compareBranch / toggleMyBranches / settings 等后续区域实现
      toast('该功能正在补齐中');
  }
}
