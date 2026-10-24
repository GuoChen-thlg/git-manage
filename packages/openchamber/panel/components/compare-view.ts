/**
 * 分支比较视图
 * 对齐 IntelliJ IDEA 的 Compare Branches：上下两个提交列表，
 * 上方为目标分支相对当前分支多出的提交，下方为反向（当前分支多出的提交）
 *
 * ┌───────────────────────────────────────────┐
 * │ [⇄] feature-x 与 main 比较            [×] │
 * │───────────────────────────────────────────│
 * │ feature-x 独有的提交（N 个）               │
 * │ ● abc1234 feat: xxx                        │
 * │───────────────────────────────────────────│
 * │ main 独有的提交（M 个）                    │
 * │ ● def5678 fix: yyy                         │
 * └───────────────────────────────────────────┘
 */

import { html } from '../html';
import { CommitInfo } from '../state';
import { ServiceClient } from '../service';
import { t, getLang } from '../i18n';
import { getIcon } from '../icons';

/** 视图关闭时的清理句柄 */
export interface CompareViewHandle {
  /** 关闭视图并释放资源（幂等） */
  dispose: () => void;
}

/** 比较视图覆盖层元素 id（单例，重复打开时先关闭旧的） */
const OVERLAY_ID = 'git-compare-branches';

/**
 * 格式化提交时间：7 天内显示相对时间，其余按当前语言显示日期
 * @param date 提交时间（ISO 字符串）
 * @returns 展示用时间文案
 */
function formatDate(date: string): string {
  const d = new Date(date);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return t('time.justNow');
  if (diffMin < 60) return t('time.minutesAgo', { n: diffMin });
  if (Math.floor(diffMin / 60) < 24) return t('time.hoursAgo', { n: Math.floor(diffMin / 60) });
  if (Math.floor(diffMin / 1440) < 7) return t('time.daysAgo', { n: Math.floor(diffMin / 1440) });
  return d.toLocaleDateString(getLang());
}

/**
 * 渲染单个提交列表区域
 * @param commits 提交列表
 * @param emptyText 空列表提示
 * @param onCommitClick 点击提交行的回调
 * @returns 列表 DOM 元素
 */
function renderCommitList(
  commits: CommitInfo[],
  emptyText: string,
  onCommitClick: (commit: CommitInfo) => void,
): HTMLElement {
  const list = document.createElement('div');
  list.style.cssText = 'flex: 1; overflow-y: auto; min-height: 0;';

  if (commits.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding: 12px 8px; color: #888; font-size: 12px; text-align: center;';
    empty.textContent = emptyText;
    list.appendChild(empty);
    return list;
  }

  for (const commit of commits) {
    const row = document.createElement('div');
    row.dataset.hash = commit.hash;
    row.style.cssText = 'display: flex; align-items: center; padding: 2px 8px; cursor: pointer; border-bottom: 1px solid #2a2a2a; font-size: 12px; height: 28px; box-sizing: border-box;';

    // 圆点指示器
    const dot = document.createElement('span');
    dot.style.cssText = 'width: 16px; text-align: center; flex-shrink: 0;';
    dot.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#e8a838"/></svg>';
    row.appendChild(dot);

    // 短哈希
    const hashEl = document.createElement('span');
    hashEl.style.cssText = 'font-family: monospace; color: #888; font-size: 11px; flex-shrink: 0; margin-right: 6px; white-space: nowrap;';
    hashEl.textContent = commit.shortHash;
    row.appendChild(hashEl);

    // 提交消息
    const msgEl = document.createElement('span');
    msgEl.style.cssText = 'flex: 1; color: #ccc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 4px;';
    msgEl.textContent = commit.message;
    msgEl.title = commit.message;
    row.appendChild(msgEl);

    // 时间
    const dateEl = document.createElement('span');
    dateEl.style.cssText = 'margin-left: auto; color: #888; font-size: 11px; flex-shrink: 0; white-space: nowrap;';
    dateEl.textContent = formatDate(commit.date);
    row.appendChild(dateEl);

    // 作者
    const authorEl = document.createElement('span');
    authorEl.style.cssText = 'margin-left: 12px; color: #888; font-size: 11px; flex-shrink: 0; white-space: nowrap;';
    authorEl.textContent = commit.authorName;
    row.appendChild(authorEl);

    row.addEventListener('mouseenter', () => { row.style.background = '#2a2d2e'; });
    row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });
    row.addEventListener('click', () => onCommitClick(commit));

    list.appendChild(row);
  }

  return list;
}

/**
 * 打开分支比较视图
 * 上方列表：目标分支有、当前分支没有的提交（`当前分支..目标分支`）
 * 下方列表：当前分支有、目标分支没有的提交（反向 range）
 * 重复打开时先关闭上一个视图
 * @param service 服务客户端
 * @param directory 仓库目录
 * @param branchName 目标分支
 * @param currentBranch 当前分支
 * @param onCommitSelect 点击比较结果中提交项的回调（加载该提交详情）
 * @returns 视图句柄
 */
export function showCompareBranchesView(
  service: ServiceClient,
  directory: string,
  branchName: string,
  currentBranch: string,
  onCommitSelect: (commit: CommitInfo) => void,
): CompareViewHandle {
  // 单例：先移除可能已存在的视图
  document.getElementById(OVERLAY_ID)?.remove();

  let closed = false;

  const overlay = html`
    <div id="${OVERLAY_ID}" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; width: 760px; max-width: 92vw; height: 560px; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden;">
        <!-- 标题栏 -->
        <div style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-bottom: 1px solid #444; flex-shrink: 0;">
          <span style="display: flex; align-items: center;">${getIcon('compareBranch')}</span>
          <span style="font-size: 13px; color: #ccc;">${t('compare.title', { branch: branchName, current: currentBranch })}</span>
          <span style="flex: 1;"></span>
          <span id="compare-close" title="${t('sidebar.close')}" style="cursor: pointer; color: #888; font-size: 14px; padding: 0 4px;">×</span>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0;">
          <!-- 目标分支独有的提交 -->
          <div style="display: flex; align-items: center; gap: 6px; padding: 4px 12px; background: #252526; border-bottom: 1px solid #333; flex-shrink: 0;">
            <span style="font-size: 11px; color: #ccc;">${t('compare.branchOnly', { branch: branchName })}</span>
            <span id="compare-only-count" style="font-size: 11px; color: #888;">…</span>
          </div>
          <div id="compare-only-list" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; border-bottom: 1px solid #444;">
            <div style="padding: 12px 8px; color: #888; font-size: 12px; text-align: center;">${t('compare.loading')}</div>
          </div>

          <!-- 当前分支独有的提交 -->
          <div style="display: flex; align-items: center; gap: 6px; padding: 4px 12px; background: #252526; border-bottom: 1px solid #333; flex-shrink: 0;">
            <span style="font-size: 11px; color: #ccc;">${t('compare.currentOnly', { current: currentBranch })}</span>
            <span id="compare-current-count" style="font-size: 11px; color: #888;">…</span>
          </div>
          <div id="compare-current-list" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0;">
            <div style="padding: 12px 8px; color: #888; font-size: 12px; text-align: center;">${t('compare.loading')}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const onlyListEl = overlay.querySelector('#compare-only-list') as HTMLElement;
  const currentListEl = overlay.querySelector('#compare-current-list') as HTMLElement;
  const onlyCountEl = overlay.querySelector('#compare-only-count') as HTMLElement;
  const currentCountEl = overlay.querySelector('#compare-current-count') as HTMLElement;

  /**
   * 关闭视图并释放资源（幂等）
   */
  const close = (): void => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
  };

  /**
   * Escape 键关闭
   * @param e 键盘事件
   */
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKeydown);

  overlay.querySelector('#compare-close')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  /**
   * 用提交列表替换某个区域的占位内容
   * @param target 目标容器
   * @param countEl 计数展示元素
   * @param commits 提交列表
   * @param emptyText 空态提示
   */
  const fill = (
    target: HTMLElement,
    countEl: HTMLElement,
    commits: CommitInfo[],
    emptyText: string,
  ): void => {
    target.innerHTML = '';
    countEl.textContent = `(${commits.length})`;
    target.appendChild(renderCommitList(commits, emptyText, (commit) => {
      onCommitSelect(commit);
    }));
  };

  /**
   * 拉取两个方向的提交并渲染；失败时就地显示错误且不关闭视图
   */
  const load = async (): Promise<void> => {
    console.debug(JSON.stringify({
      prefix: '[compare]',
      event: 'load_start',
      branch: branchName,
      current: currentBranch,
    }));
    try {
      // 上方：目标分支独有（当前分支..目标分支）
      const onlyInBranch = await service.getLog(directory, `${currentBranch}..${branchName}`);
      if (closed) return;
      fill(onlyListEl, onlyCountEl, onlyInBranch, t('compare.empty'));

      // 下方：当前分支独有（目标分支..当前分支）
      const onlyInCurrent = await service.getLog(directory, `${branchName}..${currentBranch}`);
      if (closed) return;
      fill(currentListEl, currentCountEl, onlyInCurrent, t('compare.empty'));

      console.debug(JSON.stringify({
        prefix: '[compare]',
        event: 'load_done',
        branch: branchName,
        current: currentBranch,
        branchOnly: onlyInBranch.length,
        currentOnly: onlyInCurrent.length,
      }));
    } catch (e) {
      console.error(JSON.stringify({
        prefix: '[compare]',
        event: 'load_error',
        branch: branchName,
        current: currentBranch,
        error: String(e),
      }));
      if (closed) return;
      const errorText = `${t('compare.loadFailed')}: ${e instanceof Error ? e.message : String(e)}`;
      for (const [target, countEl] of [[onlyListEl, onlyCountEl], [currentListEl, currentCountEl]] as const) {
        target.innerHTML = '';
        countEl.textContent = '';
        const error = document.createElement('div');
        error.style.cssText = 'padding: 12px 8px; color: #f44336; font-size: 12px; text-align: center;';
        error.textContent = errorText;
        target.appendChild(error);
      }
    }
  };

  void load();

  // 关闭视图时清理全局状态里与该视图相关的选中（不影响原有列表状态）
  return { dispose: close };
}
