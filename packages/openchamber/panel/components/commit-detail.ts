/**
 * 提交详情组件 - IntelliJ 风格
 */

import { html } from '../html';
import { getState, subscribeFields, CommitInfo } from '../state';
import { ServiceClient } from '../service';

export function createCommitDetailPanel(
  container: HTMLElement,
  // service/directory 为组件构造契约参数，当前实现体未消费（订阅 state 渲染），保留下划线前缀占位
  _service: ServiceClient,
  _directory: string
): { dispose: () => void } {
  let disposed = false;
  let unsubscribe: (() => void) | null = null;

  const render = () => {
    if (disposed) return;
    container.innerHTML = '';

    const state = getState();

    // 标题
    container.appendChild(html`
      <div style="padding: 4px 8px; background: #252526; border-bottom: 1px solid #333; font-size: 12px; color: #ccc; flex-shrink: 0;">
        提交详情
      </div>
    `);

    // 内容
    const content = html`
      <div style="flex: 1; overflow-y: auto; padding: 8px; font-size: 12px;"></div>
    `;

    if (!state.commitDetail) {
      content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;">选择要查看更改的提交</div>';
    } else {
      renderCommitDetail(content, state.commitDetail);
    }

    container.appendChild(content);

    // 订阅 commitDetail，变化时局部重建内容区
    if (unsubscribe) unsubscribe();
    unsubscribe = subscribeFields(['commitDetail'], () => {
      if (disposed) return;
      render();
    });
  };

  const renderCommitDetail = (container: HTMLElement, commit: CommitInfo) => {
    container.innerHTML = '';

    const fields = [
      { label: '提交', value: commit.hash, mono: true },
      { label: '作者', value: `${commit.authorName} <${commit.authorEmail}>` },
      { label: '日期', value: new Date(commit.date).toLocaleString('zh-CN') },
    ];

    for (const field of fields) {
      container.appendChild(html`
        <div style="margin-bottom: 8px;">
          <div style="color: #888; font-size: 11px; margin-bottom: 2px;">${field.label}</div>
          <div style="color: #ccc; word-break: break-all; ${field.mono ? 'font-family: monospace;' : ''}">${field.value}</div>
        </div>
      `);
    }

    // 提交消息
    container.appendChild(html`
      <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #333;">
        <div style="color: #ccc; white-space: pre-wrap;">${commit.message}</div>
      </div>
    `);
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
