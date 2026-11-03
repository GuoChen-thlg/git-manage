/**
 * 文件差异组件 - IntelliJ 风格
 */

import { html } from '../html';
import { getState, subscribeFields, FileDiff, DiffLine } from '../state';
import { ServiceClient } from '../service';
import { showFileContextMenu } from './file-context-menu';
import { showDiffPopup } from './diff-popup';
import { t } from '../i18n';
import { tokenize } from '../syntax';

export function createFileDiffPanel(
  container: HTMLElement,
  service: ServiceClient,
  directory: string
): { dispose: () => void } {
  let disposed = false;
  let listContainer: HTMLElement | null = null;
  let selectedPath: string | null = null;
  let unsubscribe: (() => void) | null = null;
  let titleEl: HTMLElement | null = null;

  const findPathFromEvent = (e: Event): string | null => {
    const target = e.target as HTMLElement;
    const item = target.closest('[data-path]');
    if (!item) return null;
    return item.getAttribute('data-path');
  };

  const render = () => {
    if (disposed) return;
    container.innerHTML = '';

    // 标题
    const state = getState();
    titleEl = html`
      <div class="gm-file-diff-title">
        ${t('file.changedFiles')} <span class="gm-file-diff-title-count">${state.diffs.length}</span>
      </div>
    `;
    container.appendChild(titleEl);

    // 文件列表
    listContainer = html`
      <div class="gm-file-diff-list"></div>
    `;

    listContainer.addEventListener('mouseenter', (e) => {
      const target = (e.target as HTMLElement).closest('[data-path]');
      if (target) (target as HTMLElement).classList.add('gm-file-diff-item-hover');
    }, true);

    listContainer.addEventListener('mouseleave', (e) => {
      const target = (e.target as HTMLElement).closest('[data-path]');
      if (target) {
        const el = target as HTMLElement;
        el.classList.remove('gm-file-diff-item-hover');
        el.classList.toggle('gm-file-diff-item-selected', el.getAttribute('data-path') === selectedPath);
      }
    }, true);

    listContainer.addEventListener('click', (e) => {
      const path = findPathFromEvent(e);
      if (!path) return;
      selectedPath = path;
      listContainer?.querySelectorAll('[data-path]').forEach(el => {
        const el2 = el as HTMLElement;
        el2.classList.toggle('gm-file-diff-item-selected', el2.getAttribute('data-path') === path);
      });
      // 点击文件条目打开并排 diff 弹窗；路径不在当前 diffs 中（如残留 DOM）时不打开
      const state = getState();
      const diffs = state.diffs;
      const index = diffs.findIndex(d => d.path === path);
      if (index !== -1) {
        showDiffPopup(diffs, index, {
          hash: state.commitDetail?.hash,
          directory,
          // 忽略空白：经 service 重新拉取提交差异（body 带 ignoreWhitespace 供服务端过滤）
          refetch: (ignoreWhitespace) =>
            service.getCommitDiffs(directory, state.commitDetail?.hash ?? '', ignoreWhitespace),
        });
      }
    });

    listContainer.addEventListener('contextmenu', (e) => {
      const path = findPathFromEvent(e);
      if (path) {
        e.preventDefault();
        const diff = getState().diffs.find(d => d.path === path);
        if (diff) showFileContextMenu(e, diff, service, directory);
      }
    });

    // 文件列表直接挂在容器下：标题 + 列表两个子节点
    container.appendChild(listContainer);

    // 渲染文件列表
    renderFileList();

    // 订阅 diffs，变化时局部更新标题计数 + 文件列表
    if (unsubscribe) unsubscribe();
    unsubscribe = subscribeFields(['diffs'], () => {
      if (disposed) return;
      updateTitleCount();
      selectedPath = null;
      renderFileList();
    });
  };

  const updateTitleCount = () => {
    if (!titleEl) return;
    const count = getState().diffs.length;
    const span = titleEl.querySelector('span');
    if (span) span.textContent = String(count);
  };

  const renderFileList = () => {
    if (!listContainer) return;
    const state = getState();
    listContainer.innerHTML = '';
    if (state.diffs.length === 0) {
      listContainer.innerHTML = `<div class="gm-file-diff-empty">${t('file.noChanges')}</div>`;
      return;
    }
    for (const diff of state.diffs) {
      listContainer.appendChild(createFileDiffItem(diff));
    }
  };

  const dispose = () => {
    disposed = true;
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
  render();
  return { dispose };
}

/**
 * 渲染单行差异（比较视图等处复用）
 * @param line 差异行
 * @returns 差异行元素
 */
/**
 * 把一行 diff 文本按语法高亮切成带 gm-syntax-* class 的 span 序列。
 * tokeniser 见 syntax.ts；颜色由 styles.css 的 .gm-syntax-* 规则读 --gm-syntax-* 变量上色。
 * @param content 行文本
 * @returns DocumentFragment，含多个 <span class="gm-syntax-xxx">
 */
function highlightContent(content: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const token of tokenize(content)) {
    const span = document.createElement('span');
    span.className = token.kind === 'plain' ? 'gm-syntax-plain' : `gm-syntax-${token.kind}`;
    span.textContent = token.text;
    frag.appendChild(span);
  }
  return frag;
}

export function createDiffLine(line: DiffLine): HTMLElement {
  let lineClass = 'gm-diff-line gm-diff-line-context';
  let prefix = ' ';

  if (line.type === 'add') {
    lineClass = 'gm-diff-line gm-diff-line-add';
    prefix = '+';
  } else if (line.type === 'delete') {
    lineClass = 'gm-diff-line gm-diff-line-delete';
    prefix = '-';
  }

  const lineNum = line.newLine !== undefined ? String(line.newLine) : ' ';
  const oldNum = line.oldLine !== undefined ? String(line.oldLine) : ' ';

  const el = html`
    <div class="${lineClass}">
      <span class="gm-diff-line-num">${oldNum}</span>
      <span class="gm-diff-line-num">${lineNum}</span>
      <span class="gm-diff-line-prefix">${prefix}</span>
      <span class="gm-diff-line-content"></span>
    </div>
  `;
  // 语法高亮：content 按 token 拆成 span 序列，颜色走 --gm-syntax-* 变量
  el.querySelector('.gm-diff-line-content')!.appendChild(highlightContent(line.content));
  return el;
}

function createFileDiffItem(diff: FileDiff): HTMLElement {
  const statusLabel = getStatusLabel(diff.path);
  const statusClass = getStatusClass(statusLabel);

  return html`
    <div 
      class="gm-file-diff-item"
      data-path="${diff.path}"
    >
      <span class="gm-file-diff-status ${statusClass}">${statusLabel}</span>
      <span class="gm-file-diff-path">${diff.path}</span>
      <span class="gm-file-diff-additions">+${diff.additions}</span>
      <span class="gm-file-diff-deletions">-${diff.deletions}</span>
    </div>
  `;
}

function getStatusLabel(path: string): string {
  if (path.includes('.new.') || path.includes('.added.')) return 'A';
  if (path.includes('.deleted.') || path.includes('.removed.')) return 'D';
  if (path.includes('.modified.') || path.includes('.changed.')) return 'M';
  if (path.includes('.renamed.')) return 'R';
  return 'M';
}

function getStatusClass(label: string): string {
  switch (label) {
    case 'A': return 'gm-file-diff-status-add';
    case 'D': return 'gm-file-diff-status-del';
    case 'M': return 'gm-file-diff-status-mod';
    case 'R': return 'gm-file-diff-status-ren';
    default: return 'gm-file-diff-status-mod';
  }
}
