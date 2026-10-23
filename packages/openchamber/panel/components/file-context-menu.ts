/**
 * 文件右键菜单组件
 * 显示文件操作菜单
 */

import { html } from '../html';
import { FileDiff } from '../state';
import { t } from '../i18n';
import { ServiceClient } from '../service';

/** 菜单项类型 */
interface MenuItem {
  label: string;
  icon?: string;
  danger?: boolean;
  action: () => void | Promise<void>;
}

interface MenuSeparator {
  type: 'separator';
}

/** 隐藏文件右键菜单 */
export function hideFileContextMenu(): void {
  const existing = document.getElementById('git-file-context-menu');
  if (existing) existing.remove();
}

/** 显示文件右键菜单 */
export function showFileContextMenu(
  e: MouseEvent,
  fileDiff: FileDiff,
  // service/directory 属于调用契约占位参数，当前菜单项动作未消费（仅日志占位）
  _service: ServiceClient,
  _directory: string
): void {
  hideFileContextMenu();

  const items: (MenuItem | MenuSeparator)[] = [
    {
      label: t('file.showDiff'),
      action: () => {
        console.log("[git-manager] Show Diff:", fileDiff.path);
      },
    },
    {
      label: t('file.showDiffNew'),
      action: () => {
        console.log("[git-manager] Show Diff in New Window:", fileDiff.path);
      },
    },
    { type: "separator" },
    {
      label: t('file.compareLocal'),
      action: () => {
        console.log("[git-manager] Compare with Local:", fileDiff.path);
      },
    },
    {
      label: t('file.compareBeforeLocal'),
      action: () => {
        console.log("[git-manager] Compare Before with Local:", fileDiff.path);
      },
    },
    { type: "separator" },
    {
      label: t('file.editSource'),
      action: () => {
        console.log("[git-manager] Edit Source:", fileDiff.path);
      },
    },
    {
      label: t('file.openRepoVersion'),
      action: () => {
        console.log("[git-manager] Open Repository Version:", fileDiff.path);
      },
    },
    { type: "separator" },
    {
      label: t('file.revertChanges'),
      danger: true,
      action: async () => {
        console.log("[git-manager] Revert Selected Changes:", fileDiff.path);
      },
    },
    {
      label: t('file.cherryPickChanges'),
      action: async () => {
        console.log("[git-manager] Cherry-Pick Selected Changes:", fileDiff.path);
      },
    },
    { type: "separator" },
    {
      label: t('file.createPatch'),
      action: () => {
        console.log("[git-manager] Create Patch:", fileDiff.path);
      },
    },
    {
      label: t('file.getFromRevision'),
      action: () => {
        console.log("[git-manager] Get from Revision:", fileDiff.path);
      },
    },
    {
      label: t('file.historyUpTo'),
      action: () => {
        console.log("[git-manager] History Up to Here:", fileDiff.path);
      },
    },
  ];

  const menu = html`
    <div id="git-file-context-menu" style="
      position: fixed;
      left: ${e.clientX}px;
      top: ${e.clientY}px;
      background: #2d2d2d;
      border: 1px solid #444;
      border-radius: 4px;
      padding: 4px 0;
      z-index: 1000;
      min-width: 200px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    "></div>
  `;

  for (const item of items) {
    if ("type" in item && item.type === "separator") {
      const sep = document.createElement("div");
      sep.style.height = "1px";
      sep.style.background = "#444";
      sep.style.margin = "4px 0";
      menu.appendChild(sep);
      continue;
    }

    const menuItem = item as MenuItem;
    const el = document.createElement("div");
    el.textContent = menuItem.label;
    el.style.padding = "6px 12px";
    el.style.cursor = "pointer";
    el.style.fontSize = "12px";
    el.style.color = menuItem.danger ? "#f44336" : "#ccc";

    menu.appendChild(el);
  }

  menu.addEventListener('mouseenter', (ev) => {
    const target = (ev.target as HTMLElement).closest('div');
    if (target && target.parentElement === menu) {
      target.style.background = "#3a3a3a";
    }
  }, true);

  menu.addEventListener('mouseleave', (ev) => {
    const target = (ev.target as HTMLElement).closest('div');
    if (target && target.parentElement === menu) {
      target.style.background = "transparent";
    }
  }, true);

  menu.addEventListener('click', async (ev) => {
    const target = (ev.target as HTMLElement).closest('div');
    if (!target || target.parentElement !== menu) return;

    const label = target.textContent;
    const item = items.find(i => !("type" in i) && (i as MenuItem).label === label) as MenuItem | undefined;
    if (item) {
      hideFileContextMenu();
      await item.action();
    }
  });

  document.body.appendChild(menu);

  const closeHandler = (ev: MouseEvent) => {
    if (!menu.contains(ev.target as Node)) {
      hideFileContextMenu();
      document.removeEventListener("click", closeHandler);
    }
  };
  setTimeout(() => document.addEventListener("click", closeHandler), 0);
}
