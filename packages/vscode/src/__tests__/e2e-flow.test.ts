/**
 * 端到端测试：完整用户流程
 * 用真实 git 仓库 + 真实 core 调用 + jsdom 渲染面板脚本，
 * 验证「操作 → 数据 → 界面」整条链路，而不是各层各自打桩。
 *
 * 与其他测试的区别：
 *   - handler 测试打桩 core，只验参数传递
 *   - script 测试打桩主进程，只验前端渲染
 *   - 本文件不打桩 core，用临时 git 仓库跑真实命令
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

/** 临时仓库目录 */
let repo: string;

/**
 * 在测试仓库执行 git
 * @param args git 参数
 */
async function git(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd: repo });
  return stdout.trim();
}

/**
 * 搭建测试仓库：多条分支、多个作者、多个提交
 */
async function setupRepo(): Promise<void> {
  repo = mkdtempSync(join(tmpdir(), 'git-manager-e2e-'));
  await git(['init', '-b', 'main']);
  await git(['config', 'user.email', 'alice@example.com']);
  await git(['config', 'user.name', 'Alice']);
  await git(['config', 'commit.gpgsign', 'false']);

  // 主分支两个提交，含不同目录
  mkdirSync(join(repo, 'src'), { recursive: true });
  writeFileSync(join(repo, 'README.md'), '# readme\n');
  await git(['add', '.']);
  await git(['commit', '-m', 'init: 初始提交']);

  writeFileSync(join(repo, 'src/a.ts'), 'export const a = 1;\n');
  await git(['add', '.']);
  await git(['commit', '-m', 'feat: 添加 a.ts']);

  // 另一位作者的提交
  await git(['config', 'user.name', 'Bob']);
  await git(['config', 'user.email', 'bob@example.com']);
  writeFileSync(join(repo, 'src/b.ts'), 'export const b = 2;\n');
  await git(['add', '.']);
  await git(['commit', '-m', 'feat: 添加 b.ts']);

  // 一条特性分支
  await git(['checkout', '-b', 'feature/x']);
  writeFileSync(join(repo, 'src/c.ts'), 'export const c = 3;\n');
  await git(['add', '.']);
  await git(['commit', '-m', 'feat: 特性分支提交']);
  await git(['checkout', 'main']);
}

/**
 * 创建面板环境，主进程用真实 core 处理请求
 * @returns jsdom 窗口与请求记录
 */
async function bootPanel() {
  const dom = new JSDOM(
    `<!DOCTYPE html><body><div id="app"><div id="content">
      <div id="sidebar"></div><div id="branches"></div>
      <div id="center"><div id="toolbar"></div><div id="commits"></div></div>
      <div id="detail"></div>
    </div><div id="bottom"></div></div></body>`,
    { runScripts: 'outside-only' },
  );
  const { window } = dom;
  const sent: Array<{ id: number; method: string; params: Record<string, unknown> }> = [];

  // 真实调用 handler，不打桩 core
  const { handleRequest } = await import('../webview/handler');
  const store = { getFavorites: () => [], setFavorites: () => {} };

  (window as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi = () => ({
    postMessage: (message: { id: number; method: string; params: Record<string, unknown> }) => {
      sent.push(message);
      void (async () => {
        let reply: Record<string, unknown>;
        try {
          const data = await handleRequest(message.method as never, message.params as never, repo, store);
          reply = { type: 'response', id: message.id, ok: true, data: data ?? null };
        } catch (err) {
          reply = { type: 'response', id: message.id, ok: false, error: String(err instanceof Error ? err.message : err) };
        }
        window.postMessage(reply, '*');
      })();
    },
  });

  const { PANEL_SCRIPT } = await import('../webview/script');
  (window as unknown as { __ICONS__: Record<string, string> }).__ICONS__ = {};
  window.eval(PANEL_SCRIPT);
  return { window, document: window.document, sent };
}

/** 等待异步完成 */
const settle = (ms = 200) => new Promise(r => setTimeout(r, ms));

describe('端到端：真实仓库完整流程', () => {
  beforeAll(async () => {
    await setupRepo();
  }, 30000);

  afterAll(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('启动后应加载真实的分支与提交数据', async () => {
    const { document } = await bootPanel();
    await settle(400);

    const branchText = document.getElementById('branches')!.textContent ?? '';
    // 真实仓库里有 main 与 feature/x
    expect(branchText).toContain('main');
    expect(branchText).toContain('feature/x');

    const commitText = document.getElementById('commits')!.textContent ?? '';
    expect(commitText).toContain('feat: 添加 b.ts');
    expect(commitText).toContain('init: 初始提交');
  }, 20000);

  it('按作者过滤应真正筛选出该作者的提交', async () => {
    const { document } = await bootPanel();
    await settle(400);

    // 打开用户下拉
    const userBtn = [...document.querySelectorAll('#toolbar .tb-btn')]
      .find(b => b.textContent === '用户') as HTMLElement;
    userBtn.click();
    await settle(60);

    // 应列出真实作者
    const labels = [...document.querySelectorAll('.dd-label')].map(el => el.textContent);
    expect(labels).toContain('Alice');
    expect(labels).toContain('Bob');

    // 选择 Bob
    const bob = [...document.querySelectorAll('.dd-item')]
      .find(it => it.textContent?.includes('Bob')) as HTMLElement;
    bob.click();
    await settle(150);

    const rows = [...document.querySelectorAll('.commit-item')] as HTMLElement[];
    expect(rows.length).toBeGreaterThan(0);
    // 只剩 Bob 的提交
    for (const r of rows) {
      expect(r.textContent).toContain('添加 b.ts');
    }
  }, 20000);

  it('按路径过滤应只返回触碰该路径的提交', async () => {
    const { document, sent } = await bootPanel();
    await settle(400);

    const pathBtn = [...document.querySelectorAll('#toolbar .tb-btn')]
      .find(b => b.textContent === '路径') as HTMLElement;
    pathBtn.click();
    await settle(60);

    ([...document.querySelectorAll('.dd-item')]
      .find(it => it.textContent?.includes('选择文件夹…')) as HTMLElement).click();
    await settle(200);

    // 真实文件树应包含仓库中的文件
    const treeText = document.querySelector('.ptree')!.textContent ?? '';
    expect(treeText).toContain('README.md');
    expect(treeText).toContain('src');

    // 勾选 src 目录
    const srcRow = [...document.querySelectorAll('.ptree-row')]
      .find(r => r.querySelector('.ptree-name')?.textContent === 'src') as HTMLElement;
    srcRow.click();
    await settle(40);

    ([...document.querySelectorAll('.dlg-btn')].at(-1) as HTMLElement).click();
    await settle(250);

    // 路径交给 git：请求里应带 paths
    const call = sent.filter(m => m.method === 'getCommitLog').at(-1)!;
    expect((call.params as { paths?: string[] }).paths).toEqual(['src']);

    // 结果只含触碰 src 的提交
    const rows = [...document.querySelectorAll('.commit-item')] as HTMLElement[];
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.textContent).not.toContain('init: 初始提交');
    }
  }, 20000);

  it('按分支过滤应返回该分支的提交', async () => {
    const { document, sent } = await bootPanel();
    await settle(400);

    const branchBtn = [...document.querySelectorAll('#toolbar .tb-btn')]
      .find(b => b.textContent === '分支') as HTMLElement;
    branchBtn.click();
    await settle(60);

    const featItem = [...document.querySelectorAll('.dd-item')]
      .find(it => it.textContent?.includes('feature/x')) as HTMLElement;
    featItem.click();
    await settle(250);

    const call = sent.filter(m => m.method === 'getCommitLog').at(-1)!;
    expect((call.params as { branch?: string }).branch).toBe('feature/x');

    const text = document.getElementById('commits')!.textContent ?? '';
    expect(text).toContain('特性分支提交');
  }, 20000);

  it('点击提交应加载真实的详情与差异', async () => {
    const { document } = await bootPanel();
    await settle(400);

    // 选中第一条提交
    const row = document.querySelector('.commit-item') as HTMLElement;
    row.click();
    await settle(300);

    const detail = document.getElementById('detail')!.textContent ?? '';
    // 第一条是最新提交（Bob 的 b.ts），作者与文件都来自真实仓库
    expect(detail).toContain('Bob');
    expect(detail).toContain('bob@example.com');
    expect(detail).toContain('src/b.ts');

    // 文件差异可展开
    const fileRow = document.querySelector('.file-row') as HTMLElement;
    expect(fileRow).toBeTruthy();
    fileRow.click();
    await settle(60);
    expect(document.querySelector('.diff-lines')).toBeTruthy();
  }, 20000);
});
