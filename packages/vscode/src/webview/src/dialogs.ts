/**
 * 内置对话框 / toast / 下拉菜单
 * 从 script.ts 原样迁移：
 * - Webview 中 window.prompt / window.confirm 被 VS Code 禁用（返回 undefined），
 *   必须用自绘对话框，否则所有依赖输入的操作都会静默失效。
 * - 下拉与 OpenChamber 的工具栏下拉一致：锚定触发按钮、点击外部关闭、Escape 关闭、
 *   视口下方空间不足时向上翻转
 */

import { el, logDebug } from './dom';

/** toast 定时器 */
let toastTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 显示提示
 * @param message 文本
 * @param isError 是否为错误
 */
export function toast(message: string, isError?: boolean): void {
  let node = document.getElementById('toast');
  if (!node) {
    node = el('div');
    node.id = 'toast';
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.className = 'show' + (isError ? ' error' : '');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node!.className = ''; }, 4000);
}

// ---- 下拉菜单 ----

/** 当前打开的下拉菜单 */
let openDropdown: {
  menu: HTMLElement;
  anchorKey: string;
  onOutside?: (ev: MouseEvent) => void;
  onKey?: (ev: KeyboardEvent) => void;
} | null = null;

/**
 * 关闭下拉菜单
 * 必须同时移除 document 上的监听，否则每次打开都会残留一对，
 * 残留监听会在下次菜单刚打开时把它关掉（表现为「点不开」）
 */
export function closeDropdown(): void {
  if (!openDropdown) return;
  openDropdown.menu.remove();
  if (openDropdown.onOutside) document.removeEventListener('click', openDropdown.onOutside);
  if (openDropdown.onKey) document.removeEventListener('keydown', openDropdown.onKey);
  openDropdown = null;
}

/** 下拉菜单条目 */
export interface DropdownItem {
  id: string;
  label: string;
  kind?: 'separator' | 'group';
  checked?: boolean;
  disabled?: boolean;
}

/**
 * 显示下拉菜单
 * @param anchor 触发元素（用于同一元素去重与默认定位）
 * @param items 菜单条目
 * @param onSelect 选中回调
 * @param at 指定弹出坐标（右键场景，传入鼠标位置）；省略时基于 anchor 矩形定位
 */
export function showDropdown(
  anchor: HTMLElement,
  items: DropdownItem[],
  onSelect: (id: string) => void,
  at?: { x: number; y: number },
): void {
  // 用按钮文案判定是否同一按钮：工具栏重建后节点引用会变，不能靠引用比较
  const anchorKey = (anchor && anchor.textContent) || '';
  const sameAnchor = openDropdown && openDropdown.anchorKey === anchorKey;
  closeDropdown();
  if (sameAnchor) return;

  const menu = el('div', 'dd-menu');

  items.forEach(function (item) {
    if (item.kind === 'separator') {
      menu.appendChild(el('div', 'dd-sep'));
      return;
    }
    if (item.kind === 'group') {
      menu.appendChild(el('div', 'dd-group', item.label));
      return;
    }

    const row = el('div', 'dd-item' + (item.checked ? ' checked' : '') + (item.disabled ? ' disabled' : ''));
    row.appendChild(el('span', 'dd-check', item.checked ? '✓' : ''));
    row.appendChild(el('span', 'dd-label', item.label));
    if (!item.disabled) {
      row.onclick = function () {
        closeDropdown();
        onSelect(item.id);
      };
    }
    menu.appendChild(row);
  });

  document.body.appendChild(menu);
  logDebug('panel', 'dropdown_shown', {
    itemCount: items.length,
    labels: items.map(function (i) { return i.label; }),
  });

  // 定位：传入坐标时以坐标为准，否则落在触发元素下方；空间不足时翻转
  const menuRect = menu.getBoundingClientRect();
  let top: number;
  let left: number;
  if (at) {
    top = at.y;
    left = at.x;
  } else {
    const rect = anchor.getBoundingClientRect();
    top = rect.bottom + 2;
    left = rect.left;
  }
  if (top + menuRect.height > window.innerHeight - 4) {
    top = Math.max(4, top - menuRect.height - 2);
  }
  if (left + menuRect.width > window.innerWidth - 4) {
    left = Math.max(4, window.innerWidth - menuRect.width - 4);
  }
  menu.style.top = top + 'px';
  menu.style.left = left + 'px';

  // 记录监听函数，closeDropdown 时统一解绑
  function onOutside(ev: MouseEvent) {
    if (!menu.contains(ev.target as Node)) closeDropdown();
  }
  function onKey(ev: KeyboardEvent) {
    if (ev.key === 'Escape') closeDropdown();
  }

  openDropdown = { menu: menu, anchorKey: anchorKey, onOutside: onOutside, onKey: onKey };

  // 延迟注册外部点击，避免打开这次点击立即关闭
  setTimeout(function () {
    // 菜单可能已在延迟期间关闭，此时不再注册
    if (!openDropdown || openDropdown.menu !== menu) return;
    document.addEventListener('click', onOutside);
    document.addEventListener('keydown', onKey);
  }, 0);
}

// ---- 内置对话框 ----

/**
 * 显示输入对话框
 * @param message 提示文案
 * @param defaultValue 预填值
 * @returns 输入内容；取消返回 null
 */
export function showPrompt(message: string, defaultValue?: string): Promise<string | null> {
  return new Promise(function (resolve) {
    const overlay = el('div', 'dlg-overlay');
    const box = el('div', 'dlg-box');

    box.appendChild(el('div', 'dlg-message', message));
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'dlg-input';
    input.value = defaultValue || '';
    box.appendChild(input);

    const actions = el('div', 'dlg-actions');
    const cancel = el('button', 'dlg-btn', '取消');
    const ok = el('button', 'dlg-btn primary', '确定');
    actions.appendChild(cancel);
    actions.appendChild(ok);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    input.focus();
    input.select();

    function finish(value: string | null) {
      overlay.remove();
      resolve(value);
    }

    cancel.onclick = function () { finish(null); };
    ok.onclick = function () { finish(input.value); };
    input.onkeydown = function (ev) {
      if (ev.key === 'Enter') finish(input.value);
      else if (ev.key === 'Escape') finish(null);
    };
    overlay.onclick = function (ev) {
      if (ev.target === overlay) finish(null);
    };
  });
}

/**
 * 显示确认对话框
 * @param message 提示文案
 * @returns 是否确认
 */
export function showConfirm(message: string): Promise<boolean> {
  return new Promise(function (resolve) {
    const overlay = el('div', 'dlg-overlay');
    const box = el('div', 'dlg-box');

    box.appendChild(el('div', 'dlg-message', message));
    const actions = el('div', 'dlg-actions');
    const cancel = el('button', 'dlg-btn', '取消');
    const ok = el('button', 'dlg-btn primary', '确定');
    actions.appendChild(cancel);
    actions.appendChild(ok);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    ok.focus();

    function finish(value: boolean) {
      overlay.remove();
      resolve(value);
    }

    cancel.onclick = function () { finish(false); };
    ok.onclick = function () { finish(true); };
    overlay.onclick = function (ev) {
      if (ev.target === overlay) finish(false);
    };
  });
}
