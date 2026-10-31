/**
 * 文件差异组件 - IntelliJ 风格
 */

import { html } from '../html';
import { getState, subscribeFields, FileDiff, DiffLine } from '../state';
import { ServiceClient } from '../service';
import { showFileContextMenu } from './file-context-menu';
import { t } from '../i18n';

export function createFileDiffPanel(
  container: HTMLElement,
  service: ServiceClient,
  directory: string
): { dispose: () => void } {
  let disposed = false;
  let listContainer: HTMLElement | null = null;
  let previewContainer: HTMLElement | null = null;
  let selectedPath: string | null = null;
  let unsubscribe: (() => void) | null = null;
  let titleEl: HTMLElement | null = null;

  const findPathFromEvent = (e: Event): string | null => {
    const target = e.target as HTMLElement;
    const item = target.closest('[data-path]');
    if (!item) return null;
    return item.getAttribute('data-path');
  };

  const renderPreview = (diff: FileDiff | null) => {
    if (!previewContainer) return;
    previewContainer.innerHTML = '';

    if (!diff) {
      previewContainer.innerHTML = `<div class="gm-file-diff-empty">${t('file.selectDiff')}</div>`;
      return;
    }

    const title = html`
      <div class="gm-file-diff-preview-title">
        ${diff.path}
      </div>
    `;
    previewContainer.appendChild(title);

    const diffContent = html`
      <div class="gm-file-diff-content"></div>
    `;

    if (diff.lines && diff.lines.length > 0) {
      for (const line of diff.lines) {
        diffContent.appendChild(createDiffLine(line));
      }
    } else {
      diffContent.innerHTML = `<div class="gm-file-diff-empty-inline">${t('file.noDiff')}</div>`;
    }

    previewContainer.appendChild(diffContent);
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

    // 文件列表 + 预览 (上下分割)
    const splitArea = html`
      <div class="gm-file-diff-split"></div>
    `;

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
      if (path) {
        selectedPath = path;
        const diff = getState().diffs.find(d => d.path === path) || null;
        renderPreview(diff);
        listContainer?.querySelectorAll('[data-path]').forEach(el => {
          const el2 = el as HTMLElement;
          el2.classList.toggle('gm-file-diff-item-selected', el2.getAttribute('data-path') === path);
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

    splitArea.appendChild(listContainer);

    // 差异预览
    previewContainer = html`
      <div class="gm-file-diff-preview"></div>
    `;
    splitArea.appendChild(previewContainer);

    container.appendChild(splitArea);

    // 渲染文件列表
    renderFileList();

    renderPreview(null);

    // 订阅 diffs，变化时局部更新标题计数 + 文件列表
    if (unsubscribe) unsubscribe();
    unsubscribe = subscribeFields(['diffs'], () => {
      if (disposed) return;
      updateTitleCount();
      selectedPath = null;
      renderFileList();
      renderPreview(null);
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

  return html`
    <div class="${lineClass}">
      <span class="gm-diff-line-num">${oldNum}</span>
      <span class="gm-diff-line-num">${lineNum}</span>
      <span class="gm-diff-line-prefix">${prefix}</span>
      <span class="gm-diff-line-content">${line.content}</span>
    </div>
  `;
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
