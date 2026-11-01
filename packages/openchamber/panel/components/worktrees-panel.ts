/**
 * Worktrees 面板
 * 对齐 IDEA 的 Git worktree 管理：列出、创建、移除与清理。
 * 数据来自本地 git 命令（service 路由），不依赖宿主。
 */

import { html } from '../html';
import { t } from '../i18n';
import type { ServiceClient } from '../service';
import { mountButton, type ButtonHandle } from '@openchamber/sdk/ui';
import { showConfirmDialog, showPromptDialog } from './dialogs';
import { showOperationError } from './errors';
import type { HostClient } from '@openchamber/sdk';
/** worktree 信息（与 service 返回结构对齐） */
export interface WorktreeInfo {
  /** worktree 绝对路径 */
  path: string;
  /** 检出的提交哈希 */
  head: string;
  /** 分支引用或 null */
  branch: string | null;
  /** 是否裸仓库 */
  bare: boolean;
  /** 是否 detached HEAD */
  detached: boolean;
  /** 锁定原因 */
  locked: string | null;
  /** 是否主工作区 */
  isMain: boolean;
}

/** 面板句柄 */
export interface WorktreesPanelHandle {
  /** 重新加载列表 */
  refresh: () => Promise<void>;
  /** 释放资源 */
  dispose: () => void;
}

/**
 * 创建 Worktrees 面板
 * @param container 挂载容器
 * @param service 服务客户端
 * @param directory 仓库目录
 * @returns 面板句柄
 */
export function createWorktreesPanel(
  container: HTMLElement,
  service: ServiceClient,
  directory: string,
  host: HostClient,
): WorktreesPanelHandle {
  let disposed = false;
  /** Kit 工具栏按钮句柄（挂载一次，面板 dispose 时统一释放） */
  const kitButtons: ButtonHandle[] = [];
  /** Kit 移除按钮句柄（随列表行重建，每次渲染前释放旧句柄防累积） */
  let removeHandles: ButtonHandle[] = [];

  container.innerHTML = '';
  // 不覆盖容器样式：容器尺寸由调用方控制，面板自身占满下层
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.minHeight = '0';

  // 工具栏
  const toolbar = html`
    <div class="gm-wt-toolbar">
      <div data-wt-action="add" class="gm-wt-slot"></div>
      <div data-wt-action="prune" class="gm-wt-slot"></div>
      <div data-wt-action="refresh" class="gm-wt-slot"></div>
      <span data-wt-count class="gm-wt-count"></span>
    </div>
  `;
  container.appendChild(toolbar);

  // 列表
  const listEl = html`
    <div data-wt-list class="gm-wt-list"></div>
  `;
  container.appendChild(listEl);

  const countEl = toolbar.querySelector('[data-wt-count]') as HTMLElement;
  console.debug(JSON.stringify({
    prefix: '[worktree]',
    event: 'panel_created',
    toolbarButtons: toolbar.querySelectorAll('[data-wt-action]').length,
    containerChildren: container.children.length,
  }));
  /**
   * 渲染 worktree 列表
   * @param list worktree 数据
   */
  const renderList = (list: WorktreeInfo[]): void => {
    countEl.textContent = `(${list.length})`;
    // 行重建前释放上一轮的移除按钮句柄（避免监听器句柄累积）
    for (const handle of removeHandles) handle.dispose();
    removeHandles = [];
    listEl.innerHTML = '';

    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'gm-wt-empty';
      empty.textContent = t('worktree.empty');
      listEl.appendChild(empty);
      return;
    }

    for (const wt of list) {
      const row = document.createElement('div');
      row.dataset.path = wt.path;
      row.className = 'gm-wt-row';

      // 分支名（detached 时用短哈希）：主工作区蓝、普通工作区橙，由 class 承载
      const branch = document.createElement('span');
      branch.className = 'gm-wt-badge ' + (wt.isMain ? 'gm-wt-badge-main' : 'gm-wt-badge-normal');
      branch.textContent = wt.detached
        ? `detached ${wt.head.slice(0, 7)}`
        : (wt.branch ?? '').replace('refs/heads/', '');
      row.appendChild(branch);

      // 路径
      const pathEl = document.createElement('span');
      pathEl.className = 'gm-wt-path';
      pathEl.textContent = wt.path;
      pathEl.title = wt.path;
      row.appendChild(pathEl);

      // 主工作区标记
      if (wt.isMain) {
        const main = document.createElement('span');
        main.className = 'gm-wt-tag-main';
        main.textContent = t('worktree.main');
        row.appendChild(main);
      }

      // 锁定标记
      if (wt.locked) {
        const lock = document.createElement('span');
        lock.className = 'gm-wt-tag-lock';
        lock.textContent = `🔒 ${wt.locked}`;
        row.appendChild(lock);
      }

      // 移除按钮（主工作区不可移除，对齐 git 行为）
      if (!wt.isMain) {
        const removeHost = document.createElement('div');
        removeHost.className = 'gm-wt-remove-slot';
        row.appendChild(removeHost);
        const removeHandle = mountButton(removeHost, {
          label: t('worktree.remove'),
          variant: 'secondary',
          size: 'xs',
          onClick: () => {
            // 沙箱中 window.confirm 不可用，改用扩展自身对话框
            showConfirmDialog(t('worktree.removeConfirm', { path: wt.path }), async () => {
              try {
                await service.removeWorktree(directory, wt.path, false);
                await refresh();
                void host.toast({ kind: 'success', message: t('worktree.removed') }).catch(() => {});
              } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                console.error(JSON.stringify({ prefix: '[worktree]', event: 'remove_error', path: wt.path, error: message }));
                // 有未提交改动时 git 会拒绝，询问是否强制移除
                if (message.toLowerCase().includes('modified') || message.toLowerCase().includes('untracked')) {
                  showConfirmDialog(t('worktree.forceConfirm', { path: wt.path }), async () => {
                    try {
                      await service.removeWorktree(directory, wt.path, true);
                      await refresh();
                      void host.toast({ kind: 'success', message: t('worktree.removed') }).catch(() => {});
                    } catch (forceErr) {
                      // 回归：强制移除失败此前只写 console，用户看不到结果
                      showOperationError(forceErr, 'worktree.removeFailed', '[worktree]', 'force_remove_error', host);
                    }
                  }, true);
                } else {
                  // 非「有改动」类失败（权限、被占用等）同样需要提示
                  showOperationError(e, 'worktree.removeFailed', '[worktree]', 'remove_error', host);
                }
              }
            }, true);
          },
        });
        // 移除按钮随行重建，旧 handle 在 renderList 开头已 dispose，这里登记本轮句柄
        removeHandles.push(removeHandle);
      }

      listEl.appendChild(row);
    }
  };

  /**
   * 重新加载 worktree 列表
   */
  const refresh = async (): Promise<void> => {
    if (disposed) return;
    try {
      const list = await service.listWorktrees(directory);
      if (disposed) return;
      renderList(list);
      console.debug(JSON.stringify({ prefix: '[worktree]', event: 'list_loaded', count: list.length }));
    } catch (e) {
      if (disposed) return;
      console.error(JSON.stringify({ prefix: '[worktree]', event: 'list_error', error: String(e) }));
      listEl.innerHTML = `<div class="gm-wt-load-error">${t('worktree.loadFailed')}</div>`;
    }
  };

  /** 工具栏动作：刷新列表并提示 */
  const onRefresh = async (): Promise<void> => {
    await refresh();
    // 刷新本身无数据变化时用户会以为「没反应」，给出明确反馈
    void host.toast({ kind: 'success', message: t('worktree.refreshed') }).catch(() => {});
  };

  /** 工具栏动作：清理失效 worktree */
  const onPrune = async (): Promise<void> => {
    try {
      const before = listEl.querySelectorAll('[data-path]').length;
      await service.pruneWorktrees(directory);
      await refresh();
      const after = listEl.querySelectorAll('[data-path]').length;
      const removed = before - after;
      void host.toast({
        kind: 'success',
        message: removed > 0
          ? t('worktree.pruneDone', { n: removed })
          : t('worktree.pruneNothing'),
      }).catch(() => {});
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(JSON.stringify({ prefix: '[worktree]', event: 'prune_error', error: message }));
      void host.toast({ kind: 'error', message: `${t('worktree.pruneFailed')}: ${message}`, copy: true, dismiss: true }).catch(() => {});
    }
  };

  /** 工具栏动作：新增 worktree（弹多字段输入对话框） */
  const onAdd = (): void => {
    // 沙箱中 window.prompt 不可用（返回 null），改用扩展自身输入对话框
    showPromptDialog(
      t('worktree.add'),
      [
        { label: t('worktree.addPathPrompt'), placeholder: '/path/to/worktree' },
        { label: t('worktree.addBranchPrompt', { base: 'HEAD' }), placeholder: 'feature/xxx' },
      ],
      async ([path, branch]) => {
        if (!path || !branch) return;
        try {
          // createBranch=true：以新分支创建 worktree
          await service.addWorktree(directory, path, branch, true, undefined);
          await refresh();
          void host.toast({ kind: 'success', message: t('worktree.added', { path }) }).catch(() => {});
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(JSON.stringify({ prefix: '[worktree]', event: 'add_error', path, branch, error: message }));
          showConfirmDialog(`${t('worktree.addFailed')}: ${message}`, () => {}, true);
        }
      },
    );
  };

  // 工具栏按钮改用 SDK UI Kit（handle 纳入 dispose 流程）
  const mountToolbarButton = (action: string, label: string, onClick: () => void): void => {
    const host = toolbar.querySelector(`[data-wt-action="${action}"]`) as HTMLElement | null;
    if (!host) return;
    const handle = mountButton(host, {
      label,
      variant: 'secondary',
      size: 'sm',
      onClick: () => {
        console.debug(JSON.stringify({
          prefix: '[worktree]',
          event: 'toolbar_click',
          action,
          toolbarConnected: toolbar.isConnected,
          listConnected: listEl.isConnected,
        }));
        onClick();
      },
    });
    kitButtons.push(handle);
  };

  mountToolbarButton('add', t('worktree.add'), onAdd);
  mountToolbarButton('prune', t('worktree.prune'), () => { void onPrune(); });
  mountToolbarButton('refresh', t('worktree.refresh'), () => { void onRefresh(); });

  void refresh();

  return {
    refresh,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const handle of kitButtons) handle.dispose();
      kitButtons.length = 0;
      for (const handle of removeHandles) handle.dispose();
      removeHandles = [];
      container.innerHTML = '';
    },
  };
}
