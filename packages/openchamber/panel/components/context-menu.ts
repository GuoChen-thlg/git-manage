/**
 * 右键菜单组件
 * 显示分支操作菜单
 */

import { html } from '../html';
import { getState, setState, Branch, CommitInfo } from '../state';
import { t } from '../i18n';
import { host } from '../host';
import { ServiceClient, DeleteBranchResult } from '../service';
import { showRenameDialog, showDeleteBranchDialog, parseDeleteBranchError } from './dialogs';
import { showBranchDeletedNotify } from './notify';

/** 隐藏右键菜单 */
export function hideContextMenu(): void {
  const existing = document.getElementById('git-context-menu');
  if (existing) existing.remove();
}

/**
 * 删除分支成功后的统一处理（对齐 IDEA GitDeleteBranchOperation）：
 * ① 发删除通知卡片（还原 / 删除跟踪动作闭包在此构造）
 * ② 刷新分支列表并清理选中态（刷新失败仅记日志——删除成功事实优先）
 * ③ 输出成功日志
 * @param res service.deleteBranch 成功响应（含还原所需的 kind/tip/upstream/canDeleteTracking）
 * @param branch 被删除的分支
 * @param service 服务客户端（刷新与还原/删跟踪回调共用）
 * @param directory 仓库目录
 */
async function onBranchDeleted(
  res: DeleteBranchResult,
  branch: Branch,
  service: ServiceClient,
  directory: string,
): Promise<void> {
  // 删除时是否命中选中分支：还原回调据此恢复 selectedBranch
  const wasSelected = getState().selectedBranch?.name === branch.name;

  showBranchDeletedNotify({
    branchName: branch.name,
    // 仅本地分支提供"还原"：按删除前捕获的 tip（与 upstream）重建分支
    onRestore: res.kind === 'local'
      ? async () => {
          await service.restoreBranch(directory, branch.name, res.tip, res.upstream);
          // 刷新失败仅日志：回调 resolve 以 restoreBranch 成功为准（通知卡片正常关闭）
          try {
            const branches = await service.getBranches(directory);
            setState(s => {
              s.branches = branches;
              // 因删除而清空的选中分支：还原成功后恢复选中
              if (wasSelected) s.selectedBranch = branches.find(b => b.name === branch.name) ?? null;
            });
          } catch (refreshErr) {
            console.error(JSON.stringify({
              prefix: '[context-menu]',
              event: 'branch_restore_refresh_error',
              branch: branch.name,
              error: String(refreshErr),
            }));
          }
          // 还原成功提示（IDEA：删除跟踪成功无额外提示）
          void host.toast({ kind: 'success', message: t('branch.restoreSuccess', { name: branch.name }) })
            .catch((toastErr) => {
              console.error(JSON.stringify({ prefix: '[context-menu]', event: 'branch_restore_toast_error', error: String(toastErr) }));
            });
        }
      : undefined,
    // 本地分支且服务端允许删跟踪分支、有 upstream 时提供"删除跟踪的分支"
    onDeleteTracking: res.kind === 'local' && res.canDeleteTracking && res.upstream
      ? async () => {
          await service.deleteRemoteBranch(directory, res.upstream!.remote, res.upstream!.branch);
          // 刷新失败仅日志：通知卡片正常关闭
          try {
            const branches = await service.getBranches(directory);
            setState(s => { s.branches = branches; });
          } catch (refreshErr) {
            console.error(JSON.stringify({
              prefix: '[context-menu]',
              event: 'branch_delete_tracking_refresh_error',
              branch: branch.name,
              error: String(refreshErr),
            }));
          }
        }
      : undefined,
  });

  // 删除后刷新：失败只记日志不回抛（已删成功的事实优先，不显示删除失败）
  try {
    const branches = await service.getBranches(directory);
    setState(s => {
      s.branches = branches;
      // 删除的是选中分支时清空选中态
      if (s.selectedBranch?.name === branch.name) s.selectedBranch = null;
    });
  } catch (refreshErr) {
    console.error(JSON.stringify({
      prefix: '[context-menu]',
      event: 'branch_delete_refresh_error',
      branch: branch.name,
      error: String(refreshErr),
    }));
  }

  console.debug(JSON.stringify({ prefix: '[context-menu]', event: 'branch_delete_success', branch: branch.name, kind: res.kind }));
}

/**
 * 删除分支统一入口（IDEA DeleteBranchAction 语义）：
 * 无确认直接删除，服务端返回 NOT_MERGED 时弹强制删除对话框，其余错误 toast 提示
 * @param service 服务客户端
 * @param directory 仓库目录
 * @param branch 目标分支
 */
export async function performBranchDelete(
  service: ServiceClient,
  directory: string,
  branch: Branch,
): Promise<void> {
  console.debug(JSON.stringify({ prefix: '[context-menu]', event: 'branch_delete_start', branch: branch.name }));
  try {
    // 对齐 IDEA：无确认直接删除，仅服务端返回 NOT_MERGED 时才弹强制删除对话框
    const res = await service.deleteBranch(directory, branch.name);
    await onBranchDeleted(res, branch, service, directory);
  } catch (e) {
    const { code, message } = parseDeleteBranchError(e);
    console.debug(JSON.stringify({
      prefix: '[context-menu]',
      event: 'branch_delete_failed',
      branch: branch.name,
      code: code ?? null,
    }));
    if (code === 'NOT_MERGED') {
      // IDEA 未合并语义：仅此时打开强制删除对话框（打开即 force 模式）
      showDeleteBranchDialog(branch.name, async (force) => {
        const forceRes = await service.deleteBranch(directory, branch.name, force);
        await onBranchDeleted(forceRes, branch, service, directory);
      });
    } else if (code === 'NOT_FOUND') {
      void host.toast({ kind: 'error', message: t('branch.notFound', { name: branch.name }) })
        .catch((toastErr) => {
          console.error(JSON.stringify({ prefix: '[context-menu]', event: 'branch_delete_toast_error', error: String(toastErr) }));
        });
    } else {
      // GIT_ERROR / 非 JSON（网络层等）：失败前缀 + 原始 message
      void host.toast({ kind: 'error', message: `${t('branch.deleteFailed')}: ${message}` })
        .catch((toastErr) => {
          console.error(JSON.stringify({ prefix: '[context-menu]', event: 'branch_delete_toast_error', error: String(toastErr) }));
        });
    }
  }
}

/** 菜单项类型 */
interface MenuItem {
  label: string;
  icon?: string;
  danger?: boolean;
  /** 禁用态（仅展示，不可点击执行） */
  disabled?: boolean;
  action: () => void | Promise<void>;
}

interface MenuSeparator {
  type: 'separator';
}

/** 显示右键菜单 */
export function showContextMenu(
  e: MouseEvent,
  branch: Branch,
  service: ServiceClient,
  directory: string
): void {
  hideContextMenu();

  const state = getState();

  const menu = document.createElement("div");
  menu.id = "git-context-menu";
  menu.style.position = "fixed";
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;
  menu.style.background = "#2d2d2d";
  menu.style.border = "1px solid #444";
  menu.style.borderRadius = "4px";
  menu.style.padding = "4px 0";
  menu.style.zIndex = "1000";
  menu.style.minWidth = "160px";
  menu.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.5)";

  const items: (MenuItem | MenuSeparator)[] = [
    {
      label: t('branch.checkout'),
      action: async () => {
        try {
          await service.checkoutBranch(directory, branch.name);
          const branches = await service.getBranches(directory);
          setState(s => { s.branches = branches; });
        } catch (e) {
          console.error("[git-manager] 签出分支失败:", e);
        }
      },
    },
    {
      label: t('branch.rename'),
      action: () => showRenameDialog(branch, service, directory),
    },
    {
      label: t('branch.merge'),
      action: async () => {
        try {
          await service.mergeBranch(directory, branch.name);
        } catch (e) {
          console.error("[git-manager] 合并分支失败:", e);
        }
      },
    },
    {
      label: t('branch.rebase'),
      action: async () => {
        try {
          await service.rebaseBranch(directory, branch.name);
        } catch (e) {
          console.error("[git-manager] 变基失败:", e);
        }
      },
    },
    { type: "separator" },
    {
      label: t('branch.pull'),
      action: async () => {
        try {
          await service.pull(directory);
        } catch (e) {
          console.error("[git-manager] 拉取失败:", e);
        }
      },
    },
    {
      label: t('branch.push'),
      action: async () => {
        try {
          await service.push(directory);
        } catch (e) {
          console.error("[git-manager] 推送失败:", e);
        }
      },
    },
    { type: "separator" },
    {
      label: state.favorites.has(branch.name) ? t('branch.unfavorite') : t('branch.favorite'),
      action: async () => {
        const next = new Set(getState().favorites);
        if (next.has(branch.name)) {
          next.delete(branch.name);
        } else {
          next.add(branch.name);
        }
        setState(s => { s.favorites = next; });
        try {
          await service.saveFavorites(directory, [...next]);
        } catch (e) {
          console.error("[git-manager] 保存收藏失败:", e);
        }
      },
    },
    { type: "separator" },
    {
      label: t('branch.delete'),
      danger: true,
      // IDEA DeleteBranchAction：当前分支禁用删除
      disabled: branch.isCurrent,
      action: () => performBranchDelete(service, directory, branch),
    },
  ];

  /**
   * 按文案在菜单项列表中查找对应项（分隔线无文案不会命中）
   * @param label 菜单项文案
   * @returns 命中的菜单项；未命中返回 undefined
   */
  const findItemByLabel = (label: string | null): MenuItem | undefined =>
    items.find(i => !("type" in i) && (i as MenuItem).label === label) as MenuItem | undefined;

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
    el.style.cursor = menuItem.disabled ? "default" : "pointer";
    el.style.fontSize = "12px";
    el.style.color = menuItem.disabled ? "#666" : menuItem.danger ? "#f44336" : "#ccc";

    menu.appendChild(el);
  }

  // 事件委托：悬停效果和点击（禁用项跳过高亮且不执行动作）
  menu.addEventListener('mouseenter', (e) => {
    const target = (e.target as HTMLElement).closest('div');
    if (target && target.parentElement === menu && !findItemByLabel(target.textContent)?.disabled) {
      target.style.background = "#3a3a3a";
    }
  }, true);

  menu.addEventListener('mouseleave', (e) => {
    const target = (e.target as HTMLElement).closest('div');
    if (target && target.parentElement === menu) {
      target.style.background = "transparent";
    }
  }, true);

  menu.addEventListener('click', async (e) => {
    const target = (e.target as HTMLElement).closest('div');
    if (!target || target.parentElement !== menu) return;

    const item = findItemByLabel(target.textContent);
    // 禁用项（如当前分支的删除）点击不执行动作、不关闭菜单
    if (!item || item.disabled) return;
    hideContextMenu();
    await item.action();
  });

  document.body.appendChild(menu);

  // 点击其他地方关闭
  const closeHandler = (ev: MouseEvent) => {
    if (!menu.contains(ev.target as Node)) {
      hideContextMenu();
      document.removeEventListener("click", closeHandler);
    }
  };
  setTimeout(() => document.addEventListener("click", closeHandler), 0);
}

/** 显示提交右键菜单 @param batchHashes 多选批量操作的提交哈希（旧→新）；为 undefined 时显示单提交菜单 */
export function showCommitContextMenu(
  e: MouseEvent,
  commit: CommitInfo,
  service: ServiceClient,
  directory: string,
  batchHashes?: string[]
): void {
  hideContextMenu();

  const isBatch = !!batchHashes && batchHashes.length > 1;

  const items: (MenuItem | MenuSeparator)[] = isBatch
    ? buildBatchCommitItems(batchHashes!, service, directory)
    : buildSingleCommitItems(commit, service, directory);

  /**
   * 按文案在菜单项列表中查找对应项（分隔线无文案不会命中）
   * @param label 菜单项文案
   * @returns 命中的菜单项；未命中返回 undefined
   */
  const findItemByLabel = (label: string | null): MenuItem | undefined =>
    items.find(i => !("type" in i) && (i as MenuItem).label === label) as MenuItem | undefined;

  const menu = html`
    <div id="git-context-menu" style="
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
    el.style.cursor = menuItem.disabled ? "default" : "pointer";
    el.style.fontSize = "12px";
    el.style.color = menuItem.disabled ? "#666" : menuItem.danger ? "#f44336" : "#ccc";

    menu.appendChild(el);
  }

  menu.addEventListener('mouseenter', (ev) => {
    const target = (ev.target as HTMLElement).closest('div');
    if (target && target.parentElement === menu && !findItemByLabel(target.textContent)?.disabled) {
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

    const item = findItemByLabel(target.textContent);
    // 禁用项（如批量菜单的"已选中"标题）点击不执行动作、不关闭菜单
    if (!item || item.disabled) return;
    hideContextMenu();
    await item.action();
  });

  document.body.appendChild(menu);

  const closeHandler = (ev: MouseEvent) => {
    if (!menu.contains(ev.target as Node)) {
      hideContextMenu();
      document.removeEventListener("click", closeHandler);
    }
  };
  setTimeout(() => document.addEventListener("click", closeHandler), 0);
}

/** 单提交右键菜单项 */
function buildSingleCommitItems(
  commit: CommitInfo,
  service: ServiceClient,
  directory: string
): (MenuItem | MenuSeparator)[] {
  return [
    {
      label: t('commit.copyRevision'),
      action: () => navigator.clipboard.writeText(commit.hash),
    },
    { type: "separator" },
    {
      label: t('commit.cherryPick'),
      action: async () => {
        try {
          await service.cherryPick(directory, commit.hash);
        } catch (err) {
          console.error("[git-manager] Cherry-pick 失败:", err);
        }
      },
    },
    {
      label: t('commit.compareLocal'),
      action: async () => {
        try {
          const diffs = await service.diffVsLocal(directory, commit.hash);
          setState(s => { s.diffs = diffs; });
          hideContextMenu();
        } catch (err) {
          console.error(JSON.stringify({
            prefix: '[context-menu]',
            event: 'compare_local_error',
            hash: commit.hash,
            error: String(err),
          }));
        }
      },
    },
    { type: "separator" },
    {
      label: t('commit.reset'),
      action: () => {
        showResetDialog(commit, service, directory);
      },
    },
    {
      label: t('commit.revert'),
      action: async () => {
        try {
          await service.revert(directory, commit.hash);
        } catch (err) {
          console.error("[git-manager] Revert 失败:", err);
        }
      },
    },
    { type: "separator" },
    {
      label: t('commit.newBranch'),
      action: () => {
        showCreateBranchFromCommitDialog(commit, service, directory);
      },
    },
    {
      label: t('commit.newTag'),
      action: () => {
        console.log("[git-manager] New Tag from commit:", commit.hash);
      },
    },
  ];
}

/** 多选批量右键菜单项 @param hashes 选中提交哈希（旧→新） */
function buildBatchCommitItems(
  hashes: string[],
  service: ServiceClient,
  directory: string
): (MenuItem | MenuSeparator)[] {
  return [
    {
      label: t('batch.selected', { n: hashes.length }),
      disabled: true,
      action: () => {},
    },
    { type: "separator" },
    {
      label: t('batch.copyHashes'),
      action: async () => {
        try {
          await navigator.clipboard.writeText(hashes.join("\n"));
        } catch (err) {
          console.error("[git-manager] 复制哈希列表失败:", err);
        }
      },
    },
    {
      label: t('batch.cherryPickAll', { n: hashes.length }),
      action: async () => {
        if (!confirm(t('batch.confirmCherryPick', { n: hashes.length }))) return;
        for (const hash of hashes) {
          try {
            await service.cherryPick(directory, hash);
          } catch (err) {
            console.error(`[git-manager] 批量 Cherry-pick 中断于 ${hash}:`, err);
            return;
          }
        }
      },
    },
    {
      label: t('batch.revertAll', { n: hashes.length }),
      action: async () => {
        if (!confirm(t('batch.confirmRevert', { n: hashes.length }))) return;
        for (const hash of hashes) {
          try {
            await service.revert(directory, hash);
          } catch (err) {
            console.error(`[git-manager] 批量 Revert 中断于 ${hash}:`, err);
            return;
          }
        }
      },
    },
  ];
}

/** 显示 Reset 对话框 */
function showResetDialog(commit: CommitInfo, service: ServiceClient, directory: string): void {
  const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 360px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">Reset Current Branch to Here</div>
        <div style="font-size: 12px; color: #888; margin-bottom: 12px; word-break: break-all;">
          ${commit.shortHash} - ${commit.message}
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #ccc; cursor: pointer;">
            <input type="radio" name="reset-mode" value="soft" checked />
            <span><b>--soft</b> 保留工作区和暂存区</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #ccc; cursor: pointer;">
            <input type="radio" name="reset-mode" value="mixed" />
            <span><b>--mixed</b> 保留工作区，重置暂存区</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #ccc; cursor: pointer;">
            <input type="radio" name="reset-mode" value="hard" />
            <span><b>--hard</b> 丢弃所有更改</span>
          </label>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="reset-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">取消</button>
          <button id="reset-ok" style="padding: 4px 12px; background: #d32f2f; border: 1px solid #f44336; border-radius: 3px; color: #fff; cursor: pointer;">Reset</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay.querySelector('#reset-cancel')?.addEventListener('click', close);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) close();
  });

  overlay.querySelector('#reset-ok')?.addEventListener('click', async () => {
    const modeInput = overlay.querySelector('input[name="reset-mode"]:checked') as HTMLInputElement;
    const mode = (modeInput?.value || 'mixed') as 'soft' | 'mixed' | 'hard';
    try {
      await service.reset(directory, commit.hash, mode);
    } catch (err) {
      console.error("[git-manager] Reset 失败:", err);
    }
    close();
  });
}

/** 显示从提交创建分支对话框 */
function showCreateBranchFromCommitDialog(commit: CommitInfo, service: ServiceClient, directory: string): void {
  const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 320px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">从提交创建分支</div>
        <div style="font-size: 11px; color: #888; margin-bottom: 8px; word-break: break-all;">
          基于: ${commit.shortHash} - ${commit.message}
        </div>
        <input id="new-branch-from-commit" type="text" placeholder="输入分支名称..." style="width: 100%; padding: 6px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; box-sizing: border-box; margin-bottom: 12px;" />
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="branch-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">取消</button>
          <button id="branch-ok" style="padding: 4px 12px; background: #0d47a1; border: 1px solid #1565c0; border-radius: 3px; color: #fff; cursor: pointer;">创建</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = overlay.querySelector('#new-branch-from-commit') as HTMLInputElement;
  input.focus();

  const close = () => overlay.remove();

  overlay.querySelector('#branch-cancel')?.addEventListener('click', close);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) close();
  });

  const doCreate = async () => {
    const name = input.value.trim();
    if (!name) return;
    void service.debugLog?.('create-branch-submit', { name, startPoint: commit.hash, entry: 'context-menu' });
    try {
      await service.checkoutNewBranch(directory, name, commit.hash);
      const branches = await service.getBranches(directory);
      setState(s => { s.branches = branches; });
    } catch (err) {
      console.error("[git-manager] 创建分支失败:", err);
    }
    close();
  };

  overlay.querySelector('#branch-ok')?.addEventListener('click', doCreate);
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') doCreate();
  });
}
