/**
 * 提交详情组件 - IntelliJ 风格
 */

import { html } from '../html';
import { t, getLang } from '../i18n';
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
      <div class="gm-detail-title">
        ${t('detail.title')}
      </div>
    `);

    // 内容
    const content = html`
      <div class="gm-detail-content"></div>
    `;

    if (!state.commitDetail) {
      content.innerHTML = `<div class="gm-detail-empty">${t('commit.noSelection')}</div>`;
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
      { label: t('detail.hash'), value: commit.hash, mono: true },
      { label: t('detail.author'), value: `${commit.authorName} <${commit.authorEmail}>` },
      { label: t('detail.date'), value: new Date(commit.date).toLocaleString(getLang()) },
    ];

    for (const field of fields) {
      container.appendChild(html`
        <div class="gm-detail-field">
          <div class="gm-detail-label">${field.label}</div>
          <div class="${field.mono ? 'gm-detail-value gm-detail-value-mono' : 'gm-detail-value'}">${field.value}</div>
        </div>
      `);
    }

    // 提交消息
    container.appendChild(html`
      <div class="gm-detail-message-block">
        <div class="gm-detail-message">${commit.message}</div>
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