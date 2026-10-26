/**
 * 集成测试：边界与异常场景
 * 覆盖正常路径之外的输入：不存在的分支、非法名称、空参数、
 * 冲突状态、重复操作等，验证扩展不会崩溃且给出明确结果。
 */

import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** 扩展 ID */
const EXTENSION_ID = 'thlg.git-manager-vscode';

const execFileAsync = promisify(execFile);

/** 临时仓库路径 */
let repo = '';

/**
 * 定位 git
 * @returns git 路径
 */
function findGit(): string {
  for (const c of ['/usr/bin/git', '/opt/homebrew/bin/git', '/usr/local/bin/git']) {
    if (existsSync(c)) return c;
  }
  return 'git';
}

const GIT = findGit();

/**
 * 在临时仓库执行 git
 * @param args 参数
 * @returns stdout
 */
async function git(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(GIT, args, { cwd: repo });
  return stdout.trim();
}

/**
 * 调用扩展请求处理器
 * @param method 方法
 * @param params 参数
 * @returns 结果
 */
async function call(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const ext = vscode.extensions.getExtension(EXTENSION_ID)!;
  const api = await ext.activate();
  return api.handleRequest(method, params, repo);
}

/**
 * 断言调用会失败，并返回错误信息
 * @param fn 操作
 * @returns 错误文本
 */
async function expectFailure(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
  throw new Error('期望失败但实际成功');
}

// 建仓：所有 suite 共享
suiteSetup(async () => {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || !folders.length) throw new Error('需要打开工作区');
  const base = join(folders[0]!.uri.fsPath, '.tmp-boundary');
  if (existsSync(base)) rmSync(base, { recursive: true, force: true });
  mkdirSync(base, { recursive: true });
  repo = mkdtempSync(join(base, 'repo-'));

  const g = (args: string[]) => execFileSync(GIT, args, { cwd: repo, stdio: 'pipe' });
  g(['init', '-b', 'main']);
  g(['config', 'user.email', 'edge@example.com']);
  g(['config', 'user.name', 'Edge']);
  g(['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(repo, 'a.txt'), 'a\n');
  g(['add', '.']);
  g(['commit', '-m', 'init']);
});

suiteTeardown(() => {
  if (repo && existsSync(repo)) rmSync(repo, { recursive: true, force: true });
});

suite('边界：分支操作', () => {
  test('切换到不存在的分支应失败并给出可读错误', async () => {
    const msg = await expectFailure(() => call('checkoutBranch', { branch: 'no-such-branch' }));
    assert.ok(msg.length > 0, '应有错误信息');
    assert.ok(/no-such-branch|did not match|not found/i.test(msg), `错误应提及分支名，实际：${msg}`);
  });

  test('创建非法名称的分支应失败', async () => {
    // git 不允许名称含空格
    const msg = await expectFailure(() => call('createBranch', { name: 'bad name' }));
    assert.ok(msg.length > 0);
  });

  test('创建重复名称的分支应失败', async () => {
    await call('createBranch', { name: 'dup-branch', checkoutAfter: false });
    const msg = await expectFailure(() => call('createBranch', { name: 'dup-branch', checkoutAfter: false }));
    assert.ok(/already exists|已存在/i.test(msg), `应提示已存在，实际：${msg}`);
  });

  test('删除不存在的分支应失败', async () => {
    const msg = await expectFailure(() => call('deleteBranch', { name: 'ghost-branch' }));
    assert.ok(msg.length > 0);
  });

  test('删除未合并分支不带 force 应失败', async () => {
    await git(['checkout', '-b', 'unmerged-branch']);
    writeFileSync(join(repo, 'b.txt'), 'b\n');
    await git(['add', '.']);
    await git(['commit', '-m', 'unmerged work']);
    await git(['checkout', 'main']);

    const msg = await expectFailure(() => call('deleteBranch', { name: 'unmerged-branch' }));
    assert.ok(/not fully merged|not merged/i.test(msg), `应提示未合并，实际：${msg}`);

    // 带 force 应成功
    await call('deleteBranch', { name: 'unmerged-branch', force: true });
    const branches = await git(['branch', '--list']);
    assert.ok(!branches.includes('unmerged-branch'));
  });

  test('重命名不存在的分支应失败', async () => {
    const msg = await expectFailure(() => call('renameBranch', { name: 'nope', newName: 'nope2' }));
    assert.ok(msg.length > 0);
  });

  test('缺少必填参数应抛出明确错误', async () => {
    const msg1 = await expectFailure(() => call('checkoutBranch', {}));
    assert.ok(/branch/i.test(msg1), `应提示缺少 branch，实际：${msg1}`);

    const msg2 = await expectFailure(() => call('getCommitDetail', {}));
    assert.ok(/hash/i.test(msg2), `应提示缺少 hash，实际：${msg2}`);
  });
});

suite('边界：提交与路径', () => {
  test('查询不存在的提交应返回空而非崩溃', async () => {
    const detail = await call('getCommitDetail', { hash: '0000000000000000000000000000000000000000' });
    // core 对不存在的提交返回 null
    assert.ok(detail === null || typeof detail === 'object', '应返回 null 或对象');
  });

  test('带不存在路径查询提交应返回空数组', async () => {
    const commits = await call('getCommitLog', { paths: ['不存在的路径.txt'] }) as unknown[];
    assert.deepStrictEqual(commits, []);
  });

  test('limit 为 0 应视为不限制', async () => {
    const all = await call('getCommitLog', {}) as unknown[];
    const zero = await call('getCommitLog', { limit: 0 }) as unknown[];
    assert.strictEqual(zero.length, all.length, 'limit=0 应与不传一致');
  });

  test('limit 为正数应限制返回条数', async () => {
    const limited = await call('getCommitLog', { limit: 1 }) as unknown[];
    assert.strictEqual(limited.length, 1);
  });

  test('查询不存在分支的日志应失败而非返回错误数据', async () => {
    // git log 对不存在分支会报错
    const msg = await expectFailure(() => call('getCommitLog', { branch: 'no-such' }));
    assert.ok(msg.length > 0);
  });
});

suite('边界：工作区状态', () => {
  test('工作区有改动时删除提交应被拒绝', async () => {
    writeFileSync(join(repo, 'a.txt'), 'dirty\n');
    const head = await git(['rev-parse', 'HEAD']);

    const msg = await expectFailure(() => call('undoCommit', { hash: head }));
    assert.ok(msg.length > 0, '应拒绝执行');

    // 清理
    await git(['checkout', '--', 'a.txt']);
  });

  test('空白工作区状态下状态查询应正常', async () => {
    const status = await call('getStatus', {}) as { currentBranch?: string };
    assert.ok(status.currentBranch, '应返回当前分支');
  });

  test('对不存在的提交执行 revert 应失败', async () => {
    const msg = await expectFailure(() => call('revert', { hash: '0000000000000000000000000000000000000000' }));
    assert.ok(msg.length > 0);
  });

  test('对不存在的提交执行 cherry-pick 应失败', async () => {
    const msg = await expectFailure(() => call('cherryPick', { hash: '0000000000000000000000000000000000000000' }));
    assert.ok(msg.length > 0);
  });
});

suite('边界：worktree', () => {
  test('创建到已存在的路径应失败', async () => {
    await git(['branch', 'wt-edge']);
    const path = join(repo, '..', `wt-edge-${Date.now()}`);

    await call('addWorktree', { path, branchName: 'wt-edge' });

    // 同一路径再来一次应失败
    const msg = await expectFailure(() => call('addWorktree', { path, branchName: 'wt-edge' }));
    assert.ok(msg.length > 0, '重复路径应失败');

    await call('removeWorktree', { path, force: true });
  });

  test('移除不存在的 worktree 应失败', async () => {
    const msg = await expectFailure(() =>
      call('removeWorktree', { path: join(repo, '..', 'never-existed'), force: true }));
    assert.ok(msg.length > 0);
  });

  test('绑定不存在的分支创建 worktree 应失败', async () => {
    const msg = await expectFailure(() =>
      call('addWorktree', { path: join(repo, '..', `wt-x-${Date.now()}`), branchName: 'no-such-branch' }));
    assert.ok(msg.length > 0);
  });
});

suite('边界：收藏与日志', () => {
  test('收藏空列表应被接受', async () => {
    await call('saveFavorites', { favorites: [] });
    assert.deepStrictEqual(await call('getFavorites', {}), []);
  });

  test('收藏不存在的分支名应原样保存（仅本地标记）', async () => {
    // 收藏是本地状态，不校验分支是否真实存在
    await call('saveFavorites', { favorites: ['ghost'] });
    assert.deepStrictEqual(await call('getFavorites', {}), ['ghost']);
    await call('saveFavorites', { favorites: [] });
  });

  test('since 大于最新 id 时应返回空', async () => {
    const logs = await call('getCommandLogs', { since: 999999 }) as unknown[];
    assert.deepStrictEqual(logs, []);
  });

  test('清空空日志应无副作用', async () => {
    await call('clearCommandLogs', {});
    await assert.doesNotReject(call('clearCommandLogs', {}));
  });
});

suite('边界：未知方法', () => {
  test('调用未实现的方法应抛出明确错误', async () => {
    const msg = await expectFailure(() => call('notARealMethod', {}));
    assert.ok(/未实现/.test(msg), `应提示未实现，实际：${msg}`);
  });
});
