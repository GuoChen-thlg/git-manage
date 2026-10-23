/**
 * 左侧图标工具栏组件
 * 40px 宽 IntelliJ 风格图标栏，渲染 12 个 Git 快捷操作按钮
 * 图标顺序沿用原 main.ts createSidebar，首个按钮文案与箭头方向随 branchPanelHidden 动态切换
 */

import { html } from '../html';
import { getIcon } from '../icons';
import { t } from '../i18n';
import { getState, subscribeFields } from '../state';

/** 侧边栏图标按钮点击处理器集 */
export interface SidebarHandlers {
  /** 切换分支面板显隐 */
  onToggleBranchPanel: () => void;
  /** 新建分支 */
  onNewBranch: () => void;
  /** 刷新数据 */
  onRefresh: () => void;
  /** 签出目标分支 */
  onCheckout: () => void;
  /** 合并目标分支 */
  onMerge: () => void;
  /** 聚焦提交搜索框 */
  onSearch: () => void;
  /** 收藏/取消收藏目标分支 */
  onFavorite: () => void;
  /** 打开显示设置菜单（接收触发事件定位菜单） */
  onSettings: (e: MouseEvent) => void;
  /** 拉取远程更新 */
  onPull: () => void;
  /** 展开分支面板全部分组 */
  onExpandAll: () => void;
  /** 循环切换排序模式 */
  onSort: () => void;
  /** 关闭面板 */
  onClose: () => void;
}

/** 图标项定义 */
interface SidebarItem {
  /** 图标标识（data-sidebar 属性值，用于测试定位） */
  key: string;
  /** getIcon 图标名（存在 customSvg 时忽略） */
  icon: string;
  /** tooltip 文案键（首个图标动态，见 buildToggleTitle） */
  titleKey: string;
  /** 对应处理器键 */
  handler: keyof SidebarHandlers;
  /** 自定义内联 svg（icons 表中缺失的图标） */
  customSvg?: string;
}

/** 侧边栏容器样式（沿用原 main.ts 布局） */
const SIDEBAR_STYLE =
  'width: 40px; min-width: 40px; background: #2b2b2b; border-right: 1px solid #333; display: flex; flex-direction: column; align-items: center; padding: 4px 0; gap: 2px;';

/** 单个图标按钮样式 */
const BUTTON_STYLE =
  'width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 4px; color: #6E6E6E;';

/** 12 个图标项（顺序固定） */
const ITEMS: readonly SidebarItem[] = [
  { key: 'hideBranches', icon: 'hideBranches', titleKey: 'sidebar.hideBranches', handler: 'onToggleBranchPanel' },
  { key: 'newBranch', icon: 'newBranch', titleKey: 'sidebar.newBranch', handler: 'onNewBranch' },
  { key: 'refresh', icon: 'refresh', titleKey: 'sidebar.update', handler: 'onRefresh' },
  { key: 'checkout', icon: 'checkout', titleKey: 'sidebar.checkout', handler: 'onCheckout' },
  {
    key: 'merge',
    icon: 'merge',
    titleKey: 'sidebar.merge',
    handler: 'onMerge',
    customSvg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 2V14M12 2V14M4 8C4 8 8 8 12 8" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  },
  { key: 'search', icon: 'search', titleKey: 'sidebar.search', handler: 'onSearch' },
  { key: 'favorite', icon: 'favorite', titleKey: 'sidebar.favorite', handler: 'onFavorite' },
  { key: 'settings', icon: 'settings', titleKey: 'sidebar.settings', handler: 'onSettings' },
  { key: 'pull', icon: 'pull', titleKey: 'sidebar.pull', handler: 'onPull' },
  { key: 'expandAll', icon: 'expandAll', titleKey: 'sidebar.expandAll', handler: 'onExpandAll' },
  { key: 'sort', icon: 'sort', titleKey: 'sidebar.sort', handler: 'onSort' },
  { key: 'close', icon: 'close', titleKey: 'sidebar.close', handler: 'onClose' },
];

/**
 * 首个按钮（隐藏/显示分支）的动态 tooltip
 * @returns branchPanelHidden 为真时返回"显示"文案，否则返回"隐藏"文案
 */
function buildToggleTitle(): string {
  return getState().branchPanelHidden
    ? t('sidebar.showBranches')
    : t('sidebar.hideBranches');
}

/**
 * 首个按钮（隐藏/显示分支）的动态 icon
 * 展开时箭头向左（表示可收起），隐藏时箭头向右（表示可展开）
 * @returns 当前状态对应的 svg 图标
 */
function buildToggleIcon(): string {
  return getState().branchPanelHidden
    ? getIcon('showBranches')
    : getIcon('hideBranches');
}

/**
 * 创建左侧图标工具栏
 * @param container 侧边栏挂载容器（会被设为 40px 图标栏并清空旧内容）
 * @param handlers 12 个图标按钮的点击处理器
 * @returns 可复用对象：dispose 取消状态订阅并清空容器
 */
export function createSidebar(
  container: HTMLElement,
  handlers: SidebarHandlers
): { dispose: () => void } {
  let disposed = false;
  /** 首个按钮引用（动态 title 更新目标） */
  let toggleBtn: HTMLElement | null = null;

  container.style.cssText = SIDEBAR_STYLE;
  container.innerHTML = '';

  for (const item of ITEMS) {
    const isToggle = item.handler === 'onToggleBranchPanel';
    const title = isToggle ? buildToggleTitle() : t(item.titleKey);

    const btn = html`
      <div data-sidebar="${item.key}" style="${BUTTON_STYLE}" title="${title}">
        ${isToggle ? buildToggleIcon() : (item.customSvg ?? getIcon(item.icon))}
      </div>
    `;

    // hover 高亮（沿用原实现）
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#3c3c3c';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
    });

    btn.addEventListener('click', (e) => {
      if (disposed) return;
      if (item.handler === 'onSettings') {
        handlers.onSettings(e);
      } else {
        (handlers[item.handler] as () => void)();
      }
    });

    if (isToggle) toggleBtn = btn;
    container.appendChild(btn);
  }

  // 首个按钮 title 与 icon 跟随 branchPanelHidden 变化
  const unsubscribe = subscribeFields(['branchPanelHidden'], () => {
    if (disposed || !toggleBtn) return;
    toggleBtn.title = buildToggleTitle();
    toggleBtn.innerHTML = buildToggleIcon();
  });

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    unsubscribe();
    container.innerHTML = '';
    toggleBtn = null;
  };

  return { dispose };
}
