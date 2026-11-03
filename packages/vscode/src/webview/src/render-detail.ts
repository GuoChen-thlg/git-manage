/**
 * 提交详情渲染：renderDetail 与提交动作
 * 从 script.ts 原样迁移
 */

import { el } from './dom';
import { state } from './state';
import { toast } from './dialogs';
import { call } from './messaging';
import { showDiffPopup } from './diff-popup';
import { loadAll } from './data';

/**
 * 渲染提交详情
 */
export function renderDetail(): void {
  const box = document.getElementById('detail');
  if (!box) return;
  box.innerHTML = '';

  const title = el('div', 'section-title');
  title.appendChild(el('span', '', '提交详情'));
  box.appendChild(title);

  const body = el('div', 'detail-body');
  box.appendChild(body);

  if (!state.selectedCommit) {
    body.appendChild(el('div', 'empty', '选择左侧提交查看详情'));
    return;
  }
  if (!state.detail) {
    body.appendChild(el('div', 'empty', '加载中…'));
    return;
  }

  const d = state.detail;
  body.appendChild(el('div', 'message', d.message));

  function field(label: string, value: string) {
    const row = el('div', 'field');
    row.appendChild(el('span', 'label', label));
    row.appendChild(el('span', '', value));
    body.appendChild(row);
  }
  field('提交', d.hash);
  field('作者', d.authorName + ' <' + d.authorEmail + '>');
  field('时间', d.date);

  // 操作按钮
  const actions = el('div', 'section-title');
  actions.style.borderTop = '1px solid var(--vscode-panel-border)';
  actions.style.marginTop = '8px';
  [['cherry-pick', 'cherryPick'], ['revert', 'Revert']].forEach(function (pair) {
    const btn = el('button', '', pair[1]!);
    btn.onclick = function () { void runCommitAction(pair[0]!); };
    actions.appendChild(btn);
  });
  body.appendChild(actions);

  if (state.diffs && state.diffs.length) {
    body.appendChild(el('div', 'section-title', '变更文件 (' + state.diffs.length + ')'));

    // 文件列表：点击弹出 IDEA 风格并排 diff 弹窗
    const diffBox = el('div', 'diff-box');
    state.diffs.forEach(function (diff) {
      const path = diff.path || diff.file || '';

      const row = el('div', 'file-row');
      // 箭头保留恒为 ▸（无展开态，点击行为改为弹窗）
      row.appendChild(el('span', 'arrow', '▸'));
      row.appendChild(el('span', 'path', path));
      row.appendChild(el('span', 'stat', '+' + (diff.additions || 0) + ' −' + (diff.deletions || 0)));
      row.onclick = function () {
        // index = findIndex；-1 时 showDiffPopup 判定非法不打开
        const index = state.diffs.findIndex(function (d2) { return d2 === diff; });
        showDiffPopup(state.diffs, index, state.detail ? state.detail.hash : state.selectedCommit);
      };
      diffBox.appendChild(row);
    });
    body.appendChild(diffBox);
  }
}

/**
 * 执行提交动作（cherry-pick / revert）
 * @param action 方法名
 */
export async function runCommitAction(action: string): Promise<void> {
  if (!state.selectedCommit) return;
  try {
    await call(action, { hash: state.selectedCommit });
    toast('操作完成');
    await loadAll();
  } catch (err) {
    toast('操作失败：' + (err instanceof Error ? err.message : err), true);
  }
}
