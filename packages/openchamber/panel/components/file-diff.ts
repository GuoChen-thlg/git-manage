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
      previewContainer.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:12px;">${t('file.selectDiff')}</div>`;
      return;
    }

    const title = html`
      <div style="padding: 4px 8px; background: #252526; border-bottom: 1px solid #333; font-size: 11px; color: #ccc;">
        ${diff.path}
      </div>
    `;
    previewContainer.appendChild(title);

    const diffContent = html`
      <div style="flex: 1; overflow-y: auto; font-family: monospace; font-size: 12px;"></div>
    `;

    if (diff.lines && diff.lines.length > 0) {
      for (const line of diff.lines) {
        diffContent.appendChild(createDiffLine(line));
      }
    } else {
      diffContent.innerHTML = `<div style="padding: 8px; color: #888;">${t('file.noDiff')}</div>`;
    }

    previewContainer.appendChild(diffContent);
  };

  const render = () => {
    if (disposed) return;
    container.innerHTML = '';

    // 标题
    const state = getState();
    titleEl = html`
      <div style="padding: 4px 8px; background: #252526; border-bottom: 1px solid #333; font-size: 12px; color: #ccc; flex-shrink: 0;">
        ${t('file.changedFiles')} <span style="color: #888;">${state.diffs.length}</span>
      </div>
    `;
    container.appendChild(titleEl);

    // 文件列表 + 预览 (上下分割)
    const splitArea = html`
      <div style="display: flex; flex-direction: column; flex: 1; overflow: hidden;"></div>
    `;

    // 文件列表
    listContainer = html`
      <div style="flex: 1; overflow-y: auto; overflow-x: hidden; border-bottom: 1px solid #333;"></div>
    `;

    listContainer.addEventListener('mouseenter', (e) => {
      const target = (e.target as HTMLElement).closest('[data-path]');
      if (target) (target as HTMLElement).style.background = '#2a2a2a';
    }, true);

    listContainer.addEventListener('mouseleave', (e) => {
      const target = (e.target as HTMLElement).closest('[data-path]');
      if (target) {
        (target as HTMLElement).style.background = target.getAttribute('data-path') === selectedPath ? '#2a3a4a' : 'transparent';
      }
    }, true);

    listContainer.addEventListener('click', (e) => {
      const path = findPathFromEvent(e);
      if (path) {
        selectedPath = path;
        const diff = getState().diffs.find(d => d.path === path) || null;
        renderPreview(diff);
        listContainer?.querySelectorAll('[data-path]').forEach(el => {
          (el as HTMLElement).style.background = el.getAttribute('data-path') === path ? '#2a3a4a' : 'transparent';
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
      <div style="height: 120px; min-height: 60px; display: flex; flex-direction: column; overflow: hidden; background: #1e1e1e;"></div>
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
      listContainer.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:12px;">${t('file.noChanges')}</div>`;
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
  let bgColor = 'transparent';
  let color = '#ccc';
  let prefix = ' ';

  if (line.type === 'add') { bgColor = '#1a3a1a'; color = '#4caf50'; prefix = '+'; }
  else if (line.type === 'delete') { bgColor = '#3a1a1a'; color = '#f44336'; prefix = '-'; }

  const lineNum = line.newLine !== undefined ? String(line.newLine) : ' ';
  const oldNum = line.oldLine !== undefined ? String(line.oldLine) : ' ';

  return html`
    <div style="display: flex; background: ${bgColor}; color: ${color}; font-size: 12px; line-height: 1.4;">
      <span style="width: 36px; text-align: right; padding: 0 4px; color: #666; user-select: none; flex-shrink: 0;">${oldNum}</span>
      <span style="width: 36px; text-align: right; padding: 0 4px; color: #666; user-select: none; flex-shrink: 0;">${lineNum}</span>
      <span style="width: 14px; text-align: center; user-select: none; flex-shrink: 0;">${prefix}</span>
      <span style="flex: 1; padding: 0 4px; white-space: pre; overflow-x: auto;">${line.content}</span>
    </div>
  `;
}

function createFileDiffItem(diff: FileDiff): HTMLElement {
  const statusLabel = getStatusLabel(diff.path);
  const statusColor = getStatusColor(statusLabel);

  return html`
    <div 
      style="display: flex; align-items: center; padding: 3px 8px; cursor: pointer; border-bottom: 1px solid #2a2a2a; font-size: 12px;"
      data-path="${diff.path}"
    >
      <span style="width: 14px; text-align: center; color: ${statusColor}; margin-right: 6px; font-size: 10px; font-weight: bold;">${statusLabel}</span>
      <span style="flex: 1; color: #ccc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${diff.path}</span>
      <span style="margin-left: 8px; font-size: 10px; color: #4caf50;">+${diff.additions}</span>
      <span style="margin-left: 4px; font-size: 10px; color: #f44336;">-${diff.deletions}</span>
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

function getStatusColor(label: string): string {
  switch (label) {
    case 'A': return '#4caf50';
    case 'D': return '#f44336';
    case 'M': return '#ff9800';
    case 'R': return '#589df6';
    default: return '#ccc';
  }
}
