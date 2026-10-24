/**
 * 分支比较视图
 * 对齐 IntelliJ IDEA 的 Compare Branches：
 * - 顶部两个分支选择器，可任选两个分支比较（默认使用调用方传入的分支）
 * - 左侧上下两个提交列表：上方为 A 独有提交，下方为 B 独有提交
 * - 右侧显示选中提交的详情与变更文件
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │ [⇄] [A ▼] 与 [B ▼] 比较                              [×] │
 * │──────────────────────────────────┬───────────────────────│
 * │ A 独有的提交 (N)                 │ 提交详情              │
 * │ ● abc1234 feat: xxx              │ 哈希 / 作者 / 日期    │
 * │──────────────────────────────────│ 变更文件              │
 * │ B 独有的提交 (M)                 │ ● file.ts +12 -3      │
 * │ ● def5678 fix: yyy                 │                       │
 * └──────────────────────────────────┴───────────────────────│
 */

import { html } from '../html';
import { CommitInfo, FileDiff, Branch } from '../state';
import { ServiceClient } from '../service';
import { t, getLang } from '../i18n';
import { getIcon } from '../icons';
import { showDropdownMenu } from './dropdown-menu';

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

    const dot = document.createElement('span');
    dot.style.cssText = 'width: 16px; text-align: center; flex-shrink: 0;';
    dot.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#e8a838"/></svg>';
    row.appendChild(dot);

    const hashEl = document.createElement('span');
    hashEl.style.cssText = 'font-family: monospace; color: #888; font-size: 11px; flex-shrink: 0; margin-right: 6px; white-space: nowrap;';
    hashEl.textContent = commit.shortHash;
    row.appendChild(hashEl);

    const msgEl = document.createElement('span');
    msgEl.style.cssText = 'flex: 1; color: #ccc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 4px;';
    msgEl.textContent = commit.message;
    msgEl.title = commit.message;
    row.appendChild(msgEl);

    const dateEl = document.createElement('span');
    dateEl.style.cssText = 'margin-left: auto; color: #888; font-size: 11px; flex-shrink: 0; white-space: nowrap;';
    dateEl.textContent = formatDate(commit.date);
    row.appendChild(dateEl);

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
 * 左侧列出两个分支各自独有的提交，右侧展示选中提交的详情与变更文件
 * 重复打开时先关闭上一个视图
 * @param service 服务客户端
 * @param directory 仓库目录
 * @param branches 可选分支列表（供两个选择器使用）
 * @param initialLeft 左侧分支初始值
 * @param initialRight 右侧分支初始值
 * @returns 视图句柄
 */
export function showCompareBranchesView(
  service: ServiceClient,
  directory: string,
  branches: Branch[],
  initialLeft: string,
  initialRight: string,
): CompareViewHandle {
  document.getElementById(OVERLAY_ID)?.remove();

  let closed = false;
  /** 当前比较的左/右分支 */
  let leftBranch = initialLeft;
  let rightBranch = initialRight;
  /** 当前选中的提交（详情请求按它去重，避免竞态覆盖） */
  let selectedHash: string | null = null;

  const overlay = html`
    <div id="${OVERLAY_ID}" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; width: 1080px; max-width: 96vw; height: 640px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;">
        <!-- 标题栏 + 分支选择 -->
        <div style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-bottom: 1px solid #444; flex-shrink: 0;">
          <span style="display: flex; align-items: center;">${getIcon('compareBranch')}</span>
          <button id="compare-left-btn" style="padding: 2px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; cursor: pointer; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></button>
          <span style="color: #888; font-size: 12px;">${t('compare.with')}</span>
          <button id="compare-right-btn" style="padding: 2px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; cursor: pointer; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></button>
          <span id="compare-summary" style="color: #888; font-size: 11px; margin-left: 4px;"></span>
          <span style="flex: 1;"></span>
          <span id="compare-close" title="${t('sidebar.close')}" style="cursor: pointer; color: #888; font-size: 14px; padding: 0 4px;">×</span>
        </div>

        <div style="flex: 1; display: flex; min-height: 0;">
          <!-- 左：两个提交列表 -->
          <div style="width: 56%; display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid #444;">
            <div style="display: flex; align-items: center; gap: 6px; padding: 4px 12px; background: #252526; border-bottom: 1px solid #333; flex-shrink: 0;">
              <span id="compare-left-title" style="font-size: 11px; color: #ccc;"></span>
              <span id="compare-left-count" style="font-size: 11px; color: #888;">…</span>
            </div>
            <div id="compare-left-list" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; border-bottom: 1px solid #444;">
              <div style="padding: 12px 8px; color: #888; font-size: 12px; text-align: center;">${t('compare.loading')}</div>
            </div>

            <div style="display: flex; align-items: center; gap: 6px; padding: 4px 12px; background: #252526; border-bottom: 1px solid #333; flex-shrink: 0;">
              <span id="compare-right-title" style="font-size: 11px; color: #ccc;"></span>
              <span id="compare-right-count" style="font-size: 11px; color: #888;">…</span>
            </div>
            <div id="compare-right-list" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0;">
              <div style="padding: 12px 8px; color: #888; font-size: 12px; text-align: center;">${t('compare.loading')}</div>
            </div>
          </div>

          <!-- 右：选中提交的详情与变更文件 -->
          <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
            <div id="compare-detail" style="flex: 1; overflow-y: auto; padding: 8px; font-size: 12px;">
              <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #888;">${t('commit.noSelection')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const leftListEl = overlay.querySelector('#compare-left-list') as HTMLElement;
  const rightListEl = overlay.querySelector('#compare-right-list') as HTMLElement;
  const leftCountEl = overlay.querySelector('#compare-left-count') as HTMLElement;
  const rightCountEl = overlay.querySelector('#compare-right-count') as HTMLElement;
  const leftTitleEl = overlay.querySelector('#compare-left-title') as HTMLElement;
  const rightTitleEl = overlay.querySelector('#compare-right-title') as HTMLElement;
  const leftBtn = overlay.querySelector('#compare-left-btn') as HTMLButtonElement;
  const rightBtn = overlay.querySelector('#compare-right-btn') as HTMLButtonElement;
  const detailEl = overlay.querySelector('#compare-detail') as HTMLElement;
  const summaryEl = overlay.querySelector('#compare-summary') as HTMLElement;

  /** 关闭视图并释放资源（幂等） */
  const close = (): void => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
  };

  /** Escape 键关闭 */
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKeydown);

  overlay.querySelector('#compare-close')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  /**
   * 渲染提交详情与变更文件到右侧面板
   * @param commit 提交
   * @param detail 提交详情（可为空）
   * @param diffs 变更文件列表
   */
  const renderDetail = (commit: CommitInfo, detail: CommitInfo | null, diffs: FileDiff[]): void => {
    detailEl.innerHTML = '';

    const head = document.createElement('div');
    head.style.cssText = 'margin-bottom: 8px;';
    const msg = document.createElement('div');
    msg.style.cssText = 'color: #ccc; font-size: 13px; word-break: break-word; margin-bottom: 6px;';
    msg.textContent = commit.message;
    head.appendChild(msg);

    const rows: Array<[string, string]> = [
      [t('detail.hash'), commit.hash],
      [t('detail.author'), `${commit.authorName} <${commit.authorEmail}>`],
      [t('detail.date'), new Date(commit.date).toLocaleString(getLang())],
    ];
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; gap: 8px; margin-bottom: 2px;';
      const labelEl = document.createElement('span');
      labelEl.style.cssText = 'color: #888; flex-shrink: 0; width: 48px;';
      labelEl.textContent = label;
      const valueEl = document.createElement('span');
      valueEl.style.cssText = 'color: #ccc; word-break: break-all;';
      valueEl.textContent = value;
      row.append(labelEl, valueEl);
      head.appendChild(row);
    }
    detailEl.appendChild(head);

    // 变更文件列表
    const fileTitle = document.createElement('div');
    fileTitle.style.cssText = 'color: #888; font-size: 11px; margin: 8px 0 4px; border-top: 1px solid #3a3a3a; padding-top: 6px;';
    fileTitle.textContent = `${t('file.changedFiles')} (${diffs.length})`;
    detailEl.appendChild(fileTitle);

    if (diffs.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color: #888; font-size: 11px;';
      empty.textContent = t('file.noChanges');
      detailEl.appendChild(empty);
      return;
    }

    for (const diff of diffs) {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; gap: 6px; padding: 2px 0; font-size: 11px;';

      const pathEl = document.createElement('span');
      pathEl.style.cssText = 'flex: 1; color: #ccc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      pathEl.textContent = diff.path;
      pathEl.title = diff.path;
      row.appendChild(pathEl);

      const addEl = document.createElement('span');
      addEl.style.cssText = 'color: #4caf50; flex-shrink: 0;';
      addEl.textContent = `+${diff.additions}`;
      row.appendChild(addEl);

      const delEl = document.createElement('span');
      delEl.style.cssText = 'color: #f44336; flex-shrink: 0;';
      delEl.textContent = `-${diff.deletions}`;
      row.appendChild(delEl);

      detailEl.appendChild(row);
    }

    // detail 字段（父提交等）存在时补充展示，便于定位提交关系
    if (detail && Array.isArray((detail as unknown as { parents?: string[] }).parents)) {
      const parents = (detail as unknown as { parents?: string[] }).parents ?? [];
      if (parents.length > 0) {
        const parentsTitle = document.createElement('div');
        parentsTitle.style.cssText = 'color: #888; font-size: 11px; margin: 8px 0 2px;';
        parentsTitle.textContent = 'parents';
        detailEl.appendChild(parentsTitle);
        const parentsEl = document.createElement('div');
        parentsEl.style.cssText = 'color: #888; font-size: 11px; word-break: break-all; font-family: monospace;';
        parentsEl.textContent = parents.join(', ');
        detailEl.appendChild(parentsEl);
      }
    }
  };

  /**
   * 加载并展示某个提交的详情与变更文件
   * 请求返回时若已切换到其他提交则丢弃结果，避免竞态
   * @param commit 目标提交
   */
  const loadCommitInto = async (commit: CommitInfo): Promise<void> => {
    selectedHash = commit.hash;
    detailEl.innerHTML = `<div style="color: #888; padding: 8px;">${t('compare.loading')}</div>`;
    try {
      const [detail, diffs] = await Promise.all([
        service.getCommitDetail(directory, commit.hash),
        service.getCommitDiffs(directory, commit.hash),
      ]);
      if (closed || selectedHash !== commit.hash) return;
      renderDetail(commit, detail, diffs ?? []);
    } catch (e) {
      if (closed || selectedHash !== commit.hash) return;
      console.error(JSON.stringify({
        prefix: '[compare]',
        event: 'commit_detail_error',
        hash: commit.hash,
        error: String(e),
      }));
      detailEl.innerHTML = '';
      const error = document.createElement('div');
      error.style.cssText = 'color: #f44336; padding: 8px; font-size: 12px;';
      error.textContent = `${t('compare.loadFailed')}: ${e instanceof Error ? e.message : String(e)}`;
      detailEl.appendChild(error);
    }
  };

  /**
   * 用提交列表替换某个区域的占位内容
   * @param target 目标容器
   * @param countEl 计数展示元素
   * @param commits 提交列表
   */
  const fill = (target: HTMLElement, countEl: HTMLElement, commits: CommitInfo[]): void => {
    target.innerHTML = '';
    countEl.textContent = `(${commits.length})`;
    target.appendChild(renderCommitList(commits, t('compare.empty'), (commit) => {
      void loadCommitInto(commit);
    }));
  };

  /** 拉取两个方向的提交并渲染 */
  const load = async (): Promise<void> => {
    leftBtn.textContent = leftBranch;
    rightBtn.textContent = rightBranch;
    leftTitleEl.textContent = t('compare.branchOnly', { branch: leftBranch });
    rightTitleEl.textContent = t('compare.branchOnly', { branch: rightBranch });

    console.debug(JSON.stringify({
      prefix: '[compare]',
      event: 'load_start',
      left: leftBranch,
      right: rightBranch,
    }));

    leftListEl.innerHTML = `<div style="padding: 12px 8px; color: #888; font-size: 12px; text-align: center;">${t('compare.loading')}</div>`;
    rightListEl.innerHTML = `<div style="padding: 12px 8px; color: #888; font-size: 12px; text-align: center;">${t('compare.loading')}</div>`;
    leftCountEl.textContent = '…';
    rightCountEl.textContent = '…';
    summaryEl.textContent = '';

    try {
      // 左侧：right..left（left 独有）；右侧：left..right（right 独有）
      const [onlyLeft, onlyRight] = await Promise.all([
        service.getLog(directory, `${rightBranch}..${leftBranch}`),
        service.getLog(directory, `${leftBranch}..${rightBranch}`),
      ]);
      if (closed) return;
      fill(leftListEl, leftCountEl, onlyLeft);
      fill(rightListEl, rightCountEl, onlyRight);
      summaryEl.textContent = onlyLeft.length === 0 && onlyRight.length === 0
        ? t('compare.identical')
        : '';
      console.debug(JSON.stringify({
        prefix: '[compare]',
        event: 'load_done',
        left: leftBranch,
        right: rightBranch,
        leftCount: onlyLeft.length,
        rightCount: onlyRight.length,
      }));
    } catch (e) {
      console.error(JSON.stringify({
        prefix: '[compare]',
        event: 'load_error',
        left: leftBranch,
        right: rightBranch,
        error: String(e),
      }));
      if (closed) return;
      const errorText = `${t('compare.loadFailed')}: ${e instanceof Error ? e.message : String(e)}`;
      for (const [target, countEl] of [[leftListEl, leftCountEl], [rightListEl, rightCountEl]] as const) {
        target.innerHTML = '';
        countEl.textContent = '';
        const error = document.createElement('div');
        error.style.cssText = 'padding: 12px 8px; color: #f44336; font-size: 12px; text-align: center;';
        error.textContent = errorText;
        target.appendChild(error);
      }
    }
  };

  /**
   * 打开分支选择下拉菜单
   * @param e 触发事件（定位菜单）
   * @param side 要修改的一侧
   */
  const openBranchPicker = (e: MouseEvent, side: 'left' | 'right'): void => {
    const anchor = (side === 'left' ? leftBtn : rightBtn);
    const currentName = side === 'left' ? leftBranch : rightBranch;
    const items = branches.map(b => ({
      id: b.name,
      label: b.name,
      checked: b.name === currentName,
    }));
    showDropdownMenu(anchor, items, (id) => {
      if (side === 'left') leftBranch = id;
      else rightBranch = id;
      if (leftBranch === rightBranch) {
        // 两侧相同时不做比较，重新选择即可
        summaryEl.textContent = t('compare.sameBranch');
        leftBtn.textContent = leftBranch;
        rightBtn.textContent = rightBranch;
        return;
      }
      void load();
    });
    // 事件参数仅用于记录，菜单定位由锚点元素决定
    void e;
  };

  leftBtn.addEventListener('click', (e) => { openBranchPicker(e, 'left'); });
  rightBtn.addEventListener('click', (e) => { openBranchPicker(e, 'right'); });

  void load();

  return { dispose: close };
}
