/**
 * 显示设置菜单
 * 以勾选菜单形式切换提交列表的显示列（作者/日期/哈希）
 * 样式与交互参考右键菜单 context-menu：fixed 定位、外部点击关闭、悬停高亮
 */

import { getState, setState, PanelState } from '../state';
import { t } from '../i18n';

/** displaySettings 可切换的字段键 */
type DisplaySettingKey = keyof PanelState['displaySettings'];

/** 设置菜单项定义 */
interface SettingsItem {
  /** 状态字段键 */
  key: DisplaySettingKey;
  /** i18n 文案键 */
  labelKey: string;
}

/**
 * 菜单项列表（顺序对齐 IDEA PresentationSettings）
 * 平铺展示，不分「视图/图」标题——IDEA 该菜单本身只有分隔线
 */
const SETTINGS_ITEMS: readonly SettingsItem[] = [
  // 表头列开关（对应 IDEA Toggle Columns）
  { key: 'showAuthor', labelKey: 'settings.showAuthor' },
  { key: 'showDate', labelKey: 'settings.showDate' },
  { key: 'showHash', labelKey: 'settings.showHash' },
  // 表格与提交图显示项
  { key: 'showTagNames', labelKey: 'settings.showTagNames' },
  { key: 'compactReferences', labelKey: 'settings.compactReferences' },
  { key: 'showLongEdges', labelKey: 'settings.showLongEdges' },
  { key: 'preferCommitDate', labelKey: 'settings.preferCommitDate' },
  { key: 'referencesOnLeft', labelKey: 'settings.referencesOnLeft' },
];

/** 当前生效的外部点击关闭监听（保证同时只挂一个） */
let closeHandler: ((ev: MouseEvent) => void) | null = null;

/** 移除外部点击关闭监听 */
function removeCloseHandler(): void {
  if (!closeHandler) return;
  document.removeEventListener('click', closeHandler);
  closeHandler = null;
}

/** 隐藏显示设置菜单（无菜单时安全） */
export function hideSettingsMenu(): void {
  removeCloseHandler();
  const existing = document.getElementById('git-settings-menu');
  if (existing) existing.remove();
}

/**
 * 把菜单内所有勾选指示同步为当前状态
 * @param menu 设置菜单容器
 */
function syncChecks(menu: HTMLElement): void {
  const settings = getState().displaySettings;
  for (const item of SETTINGS_ITEMS) {
    const check = menu
      .querySelector<HTMLElement>(`[data-key="${item.key}"]`)
      ?.querySelector<HTMLElement>('.git-settings-check');
    if (check) {
      check.textContent = settings[item.key] ? '✓' : '';
    }
  }
}

/**
 * 显示设置勾选菜单
 * 点击菜单项仅切换状态并刷新勾号，菜单保持打开以便连续切换
 * @param e 触发菜单的鼠标事件（用于确定菜单坐标）
 */
export function showSettingsMenu(e: MouseEvent): void {
  // 先隐藏再创建，保证重复打开只有一个菜单
  hideSettingsMenu();

  const menu = document.createElement('div');
  menu.id = 'git-settings-menu';
  menu.style.position = 'fixed';
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;
  menu.style.background = '#2d2d2d';
  menu.style.border = '1px solid #444';
  menu.style.borderRadius = '4px';
  menu.style.padding = '4px 0';
  menu.style.zIndex = '1000';
  menu.style.minWidth = '160px';
  menu.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.5)';

  // 标题
  const title = document.createElement('div');
  title.textContent = t('settings.title');
  title.style.padding = '6px 12px';
  title.style.fontSize = '11px';
  title.style.color = '#888';
  menu.appendChild(title);

  // 标题与选项之间的分隔线
  const separator = document.createElement('div');
  separator.style.height = '1px';
  separator.style.background = '#444';
  separator.style.margin = '4px 0';
  menu.appendChild(separator);

  // 平铺渲染：与 IDEA 一致，仅在「列开关」与「显示项」之间加一条分隔线
  for (const [index, item] of SETTINGS_ITEMS.entries()) {
    // 前三项为表头列开关，之后为表格/图显示项，中间插分隔线
    if (index === 3) {
      const midSep = document.createElement('div');
      midSep.style.height = '1px';
      midSep.style.background = '#444';
      midSep.style.margin = '4px 0';
      menu.appendChild(midSep);
    }
    {
      const el = document.createElement('div');
      el.dataset.key = item.key;
      el.style.padding = '6px 12px';
      el.style.cursor = 'pointer';
      el.style.fontSize = '12px';
      el.style.color = '#ccc';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.gap = '6px';

      const check = document.createElement('span');
      check.className = 'git-settings-check';
      check.style.width = '12px';
      check.style.flex = '0 0 12px';
      check.style.color = '#4caf50';

      const label = document.createElement('span');
      label.textContent = t(item.labelKey);

      el.appendChild(check);
      el.appendChild(label);
      menu.appendChild(el);
    }
  }

  syncChecks(menu);
  document.body.appendChild(menu);

  // 悬停高亮（仅开关项，标题与分隔线不响应）
  menu.addEventListener('mouseenter', (ev) => {
    const target = (ev.target as HTMLElement).closest('div');
    if (target && target.parentElement === menu && target.dataset.key) {
      target.style.background = '#3a3a3a';
    }
  }, true);

  menu.addEventListener('mouseleave', (ev) => {
    const target = (ev.target as HTMLElement).closest('div');
    if (target && target.parentElement === menu && target.dataset.key) {
      target.style.background = 'transparent';
    }
  }, true);

  // 点击开关项：切换状态并刷新勾号，菜单保持打开
  menu.addEventListener('click', (ev) => {
    const target = (ev.target as HTMLElement).closest('div') as HTMLElement | null;
    if (!target || target.parentElement !== menu) return;
    const key = target.dataset.key as DisplaySettingKey | undefined;
    if (!key) return;
    setState(s => {
      s.displaySettings[key] = !s.displaySettings[key];
    });
    syncChecks(menu);
  });

  // 点击菜单外部关闭；延迟注册避免触发菜单的那次点击立即关闭菜单
  const handler = (ev: MouseEvent): void => {
    if (!menu.isConnected) {
      // 旧菜单已被替换：仅自清理，避免残留监听误关新菜单
      document.removeEventListener('click', handler);
      return;
    }
    if (!menu.contains(ev.target as Node)) {
      hideSettingsMenu();
    }
  };
  closeHandler = handler;
  setTimeout(() => document.addEventListener('click', handler), 0);
}
