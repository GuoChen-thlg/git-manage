/**
 * 底部面板 WebviewView 测试
 * 覆盖：注册与解析、请求分派、错误返回、非请求消息忽略、仓库变更通知
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetPanels, workspace } from './__mocks__/vscode';

/** handler 替身，便于控制成功与失败 */
const mockHandleRequest = vi.fn();

vi.mock('./handler', () => ({
  handleRequest: (...args: unknown[]) => mockHandleRequest(...args),
}));

vi.mock('../webview/handler', () => ({
  handleRequest: (...args: unknown[]) => mockHandleRequest(...args),
}));

vi.mock('@git-manage/core', () => ({
  isRepository: vi.fn(async () => true),
  getRepositoryRoot: vi.fn(async () => '/repo'),
}));

describe('GitPanelView', () => {
  beforeEach(() => {
    resetPanels();
    mockHandleRequest.mockReset();
    mockHandleRequest.mockResolvedValue(null);
    workspace.workspaceFolders = [{ uri: { fsPath: '/repo' } }];
  });

  /**
   * 创建 provider 并解析视图
   * @returns 视图记录与消息回调
   */
  async function setup() {
    const mocks = await import('./__mocks__/vscode');
    const { GitPanelView, setPanelRoot, setPanelStore } = await import('../webview/panel');

    setPanelStore({ getFavorites: () => [], setFavorites: () => {} });
    setPanelRoot('/repo');

    const provider = new GitPanelView();
    const { view, record } = mocks.createWebviewView();
    provider.resolveWebviewView(view as never);

    const handler = view.webview.onDidReceiveMessage.mock.calls[0]![0] as (m: unknown) => void;
    return { provider, view, record, handler };
  }

  it('解析后应注入 HTML，页面包含全部区域', async () => {
    const { record } = await setup();
    expect(record.html).toContain('id="sidebar"');
    expect(record.html).toContain('id="branches"');
    expect(record.html).toContain('id="toolbar"');
    expect(record.html).toContain('id="commits"');
    expect(record.html).toContain('id="detail"');
    expect(record.html).toContain('id="bottom"');
  });

  it('成功的请求应返回 ok 与数据，并带上仓库根目录', async () => {
    mockHandleRequest.mockResolvedValue([{ name: 'main' }]);
    const { record, handler } = await setup();

    handler({ type: 'request', id: 7, method: 'getBranches', params: {} });
    await new Promise(r => setTimeout(r, 0));

    const response = record.postedMessages.at(-1) as { ok: boolean; id: number; data: unknown };
    expect(response.ok).toBe(true);
    expect(response.id).toBe(7);
    expect(response.data).toEqual([{ name: 'main' }]);
    expect(mockHandleRequest).toHaveBeenCalledWith('getBranches', {}, '/repo', expect.anything());
  });

  it('失败的请求应返回 ok=false 与错误信息', async () => {
    mockHandleRequest.mockRejectedValue(new Error('分支不存在'));
    const { record, handler } = await setup();

    handler({ type: 'request', id: 9, method: 'checkoutBranch', params: { branch: 'x' } });
    await new Promise(r => setTimeout(r, 0));

    const response = record.postedMessages.at(-1) as { ok: boolean; error: string };
    expect(response.ok).toBe(false);
    expect(response.error).toBe('分支不存在');
  });

  it('非仓库环境请求应返回明确错误', async () => {
    const { record, handler } = await setup();
    const { setPanelRoot } = await import('../webview/panel');
    setPanelRoot(null);

    handler({ type: 'request', id: 1, method: 'getBranches', params: {} });
    await new Promise(r => setTimeout(r, 0));

    const response = record.postedMessages.at(-1) as { ok: boolean; error: string };
    expect(response.ok).toBe(false);
    expect(response.error).toContain('不是 Git 仓库');
  });

  it('非请求消息应被忽略', async () => {
    const { record, handler } = await setup();
    const before = record.postedMessages.length;

    handler({ type: 'event' });
    handler(null);
    await new Promise(r => setTimeout(r, 0));

    expect(record.postedMessages.length).toBe(before);
    expect(mockHandleRequest).not.toHaveBeenCalled();
  });

  it('仓库变更且视图可见时应推送事件', async () => {
    const { provider, record } = await setup();
    const before = record.postedMessages.length;

    provider.notifyRepositoryChanged('/other');

    expect(record.postedMessages.length).toBe(before + 1);
    expect(record.postedMessages.at(-1)).toMatchObject({ type: 'event', name: 'repositoryChanged' });
  });
});
