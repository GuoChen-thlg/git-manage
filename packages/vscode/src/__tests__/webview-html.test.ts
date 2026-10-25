/**
 * Webview 页面生成测试
 * 覆盖：CSP 安全策略、nonce 唯一性、初始提交注入、面板与脚本挂载点
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@git-manage/core', () => ({}));

describe('buildHtml', () => {
  it('应包含内容安全策略且禁止 inline 脚本以外的来源', async () => {
    const { buildHtml } = await import('../webview/panel');
    const html = buildHtml();

    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain("default-src 'none'");
    // 脚本必须带 nonce，不允许裸 inline 或外部脚本
    expect(html).toMatch(/script-src 'nonce-[A-Za-z0-9]+'/);
  });

  it('脚本标签的 nonce 应与 CSP 声明一致', async () => {
    const { buildHtml } = await import('../webview/panel');
    const html = buildHtml();

    const cspNonce = /script-src 'nonce-([A-Za-z0-9]+)'/.exec(html)?.[1];
    const scriptNonces = [...html.matchAll(/<script nonce="([A-Za-z0-9]+)"/g)].map(m => m[1]);

    expect(cspNonce).toBeTruthy();
    expect(scriptNonces.length).toBeGreaterThan(0);
    // 所有内联脚本都使用同一个 nonce
    for (const nonce of scriptNonces) {
      expect(nonce).toBe(cspNonce);
    }
  });

  it('每次生成应使用不同 nonce', async () => {
    const { buildHtml } = await import('../webview/panel');
    const first = /nonce-([A-Za-z0-9]+)/.exec(buildHtml())?.[1];
    const second = /nonce-([A-Za-z0-9]+)/.exec(buildHtml())?.[1];

    expect(first).toBeTruthy();
    expect(first).not.toBe(second);
  });

  it('应注入初始提交哈希供面板定位', async () => {
    const { buildHtml } = await import('../webview/panel');
    const html = buildHtml('abc123def456');

    expect(html).toContain('abc123def456');
  });

  it('未指定初始提交时应为 null', async () => {
    const { buildHtml } = await import('../webview/panel');
    const html = buildHtml();

    expect(html).toContain('__INITIAL_HASH__ = null');
  });

  it('应包含四个界面区域挂载点与面板脚本', async () => {
    const { buildHtml } = await import('../webview/panel');
    const html = buildHtml();

    for (const id of ['app', 'sidebar', 'branches', 'commits', 'detail']) {
      expect(html).toContain(`id="${id}"`);
    }
    // 脚本应真正注入，而不是空壳页面
    expect(html).toContain('acquireVsCodeApi');
    expect(html).toContain('postMessage');
  });

  it('脚本内容不应包含会破坏 HTML 的未转义结束标签', async () => {
    const { buildHtml } = await import('../webview/panel');
    const html = buildHtml();

    // </script> 出现在脚本内部会提前截断
    const scriptBodies = [...html.matchAll(/<script nonce="[A-Za-z0-9]+">([\s\S]*?)<\/script>/g)].map(m => m[1]);
    for (const body of scriptBodies) {
      expect(body).not.toContain('</script');
    }
  });
});
