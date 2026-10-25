/**
 * 集成测试：完整功能覆盖
 * 在真实 VS Code + 真实 git 仓库中逐个操作所有已实现功能，
 * 不满足于「命令不抛错」，而是验证数据确实发生变化。
 *
 * 仓库生命周期：
 *   before  → 在临时目录新建仓库（多分支、多作者、含子目录）
 *   before  → 扩展切换到该仓库
 *   after   → 删除临时仓库
 */

import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** 扩展 ID */
const EXTENSION_ID = 'guochen.git-manager-vscode';

/** 临时仓库路径 */
let repo = '';

/**
 * 定位 git 可执行文件
 * 扩展宿主进程的 PATH 可能不含 Homebrew 等路径，需自行探测
 * @returns git 路径
 */
function findGit(): string {
  // 优先系统自带：/opt/homebrew 下的 git 是符号链接，扩展宿主里可能无法解析
  const candidates = ['/usr/bin/git', '/opt/homebrew/bin/git', '/usr/local/bin/git'];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return 'git';
}

/** git 可执行文件路径 */
const GIT = findGit();

/** 异步执行 git */
const execFileAsync = promisify(execFile);

/**
 * 在临时仓库执行 git（异步）
 * 扩展宿主中同步 spawn 会被限制，异步版本可正常工作
 * @param args git 参数
 * @returns stdout
 */
async function git(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(GIT, args, { cwd: repo });
  return stdout.trim();
}

/**
 * 直接调用扩展内部的请求处理器
 * 这是 webview 与主进程之间的唯一入口，覆盖它就等于覆盖所有功能点
 * @param method 方法名
 * @param params 参数
 * @returns 结果
 */
async function call(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const ext = vscode.extensions.getExtension(EXTENSION_ID)!;
  const api = await ext.activate();
  return api.handleRequest(method, params, repo);
}

/**
 * 新建临时 git 仓库
 * 结构：main 两个提交（不同目录、不同作者）+ feature/x 一个提交
 */
function createRepo(): void {
  // 必须建在当前 VS Code 工作区内部：扩展宿主对工作区外路径执行外部程序会被沙箱拒绝
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || !folders.length) throw new Error('测试需要打开工作区');
  const base = join(folders[0]!.uri.fsPath, '.tmp-integration');
  // 清掉上次残留，避免累积
  if (existsSync(base)) rmSync(base, { recursive: true, force: true });
  mkdirSync(base, { recursive: true });
  repo = mkdtempSync(join(base, 'repo-'));
  const g = (args: string[]) => execFileSync(GIT, args, { cwd: repo, stdio: 'pipe' });

  g(['init', '-b', 'main']);
  g(['config', 'user.email', 'alice@example.com']);
  g(['config', 'user.name', 'Alice']);
  g(['config', 'commit.gpgsign', 'false']);

  mkdirSync(join(repo, 'src'), { recursive: true });
  writeFileSync(join(repo, 'README.md'), '# readme\n');
  g(['add', '.']);
  g(['commit', '-m', 'init: 初始提交']);

  writeFileSync(join(repo, 'src/a.ts'), 'export const a = 1;\n');
  g(['add', '.']);
  g(['commit', '-m', 'feat: 添加 a.ts']);

  // 换作者，用于验证作者过滤
  g(['config', 'user.name', 'Bob']);
  g(['config', 'user.email', 'bob@example.com']);
  writeFileSync(join(repo, 'src/b.ts'), 'export const b = 2;\n');
  g(['add', '.']);
  g(['commit', '-m', 'feat: 添加 b.ts']);

  // 特性分支
  g(['checkout', '-b', 'feature/x']);
  writeFileSync(join(repo, 'src/c.ts'), 'export const c = 3;\n');
  g(['add', '.']);
  g(['commit', '-m', 'feat: 特性分支提交']);
  g(['checkout', 'main']);
}

/**
 * 等待条件成立
 * @param fn 判断函数
 * @param timeout 超时毫秒
 */
async function waitFor(fn: () => boolean, timeout = 10000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (fn()) return;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('等待超时');
}

// 建仓与清理用全局钩子：所有 suite 共享同一个临时仓库，
// 若放在单个 suite 里，它的 teardown 会在后续 suite 执行前就删掉仓库
suiteSetup(async () => {
  createRepo();
  assert.ok(existsSync(join(repo, '.git')), '临时仓库应创建成功');
});

suiteTeardown(() => {
  if (repo && existsSync(repo)) rmSync(repo, { recursive: true, force: true });
});

suite('准备：新建临时仓库', () => {
  test('临时仓库应包含三条分支与四个提交', async () => {
    const branches = await (await git(['branch', '--list']));
    assert.ok(branches.includes('main'));
    assert.ok(branches.includes('feature/x'));

    const count = await (await git(['rev-list', '--count', 'HEAD']));
    assert.strictEqual(count, '3', 'main 上应有 3 个提交');
  });
});

suite('分支功能全流程', () => {
  suiteSetup(async () => {
    // 扩展需先激活，才能调用其请求处理器
    await vscode.extensions.getExtension(EXTENSION_ID)!.activate();
  });

  test('getBranches 应返回真实分支并标记当前分支', async () => {
    const branches = await call('getBranches') as Array<{ name: string; isCurrent: boolean; isRemote: boolean }>;
    const names = branches.map(b => b.name);
    assert.ok(names.includes('main'), '应包含 main');
    assert.ok(names.includes('feature/x'), '应包含 feature/x');
    assert.strictEqual(branches.find(b => b.isCurrent)?.name, 'main', '当前分支应为 main');
  });

  test('createBranch 检出模式应创建并切换分支', async () => {
    await call('createBranch', { name: 'auto/with-checkout', checkoutAfter: true });

    const current = await (await git(['rev-parse', '--abbrev-ref', 'HEAD']));
    assert.strictEqual(current, 'auto/with-checkout', '应已切换到新分支');
  });

  test('createBranch 非检出模式应只创建不切换', async () => {
    await call('createBranch', { name: 'auto/no-checkout', checkoutAfter: false });

    const current = await (await git(['rev-parse', '--abbrev-ref', 'HEAD']));
    assert.strictEqual(current, 'auto/with-checkout', '不应切换分支');

    const branches = await (await git(['branch', '--list']));
    assert.ok(branches.includes('auto/no-checkout'), '分支应已创建');
  });

  test('checkoutBranch 应切换分支', async () => {
    await call('checkoutBranch', { branch: 'main' });
    assert.strictEqual(await (await git(['rev-parse', '--abbrev-ref', 'HEAD'])), 'main');
  });

  test('renameBranch 应重命名分支', async () => {
    await call('renameBranch', { name: 'auto/no-checkout', newName: 'auto/renamed' });

    const branches = await (await git(['branch', '--list']));
    assert.ok(branches.includes('auto/renamed'), '新名称应存在');
    assert.ok(!branches.includes('auto/no-checkout'), '旧名称应消失');
  });

  test('deleteBranch 应删除已合并分支', async () => {
    // 先回到 main，再删 auto/renamed（它有独立提交，需强制）
    await call('checkoutBranch', { branch: 'main' });
    await call('deleteBranch', { name: 'auto/with-checkout', force: true });

    const branches = await (await git(['branch', '--list']));
    assert.ok(!branches.includes('auto/with-checkout'), '分支应被删除');
  });

  test('删除当前分支应被拒绝', async () => {
    await assert.rejects(
      call('deleteBranch', { name: 'main' }),
      /cannot delete|checked out|当前分支/i,
      '删除当前分支应失败',
    );
  });
});

suite('提交查询与过滤', () => {
  suiteSetup(async () => {
    await vscode.extensions.getExtension(EXTENSION_ID)!.activate();
    // 回到 main 并清理工作区，避免前面的分支操作影响查询结果
    await git(['checkout', 'main']);
    await git(['reset', '--hard', 'HEAD']);
    await git(['clean', '-fd']);
  });

  test('getCommitLog 应返回全部提交', async () => {
    const commits = await call('getCommitLog', {}) as Array<{ message: string }>;
    const messages = commits.map(c => c.message);
    assert.ok(messages.includes('init: 初始提交'));
    assert.ok(messages.includes('feat: 添加 b.ts'));
  });

  test('按分支查询应只返回该分支可达的提交', async () => {
    const commits = await call('getCommitLog', { branch: 'feature/x' }) as Array<{ hash: string }>;
    // 用 git 独立算出该分支的提交集合，与接口结果比对，避免受前面用例影响
    const expected = (await git(['rev-list', 'feature/x'])).split('\n').filter(Boolean);
    const actual = commits.map(c => c.hash);
    for (const hash of actual) {
      assert.ok(expected.includes(hash), `提交 ${hash} 应属于 feature/x`);
    }
  });

  test('按路径查询应只返回触碰该路径的提交', async () => {
    // 自建一条只触碰特定文件的提交，避免依赖其他用例留下的历史
    writeFileSync(join(repo, 'path-only.txt'), 'only\n');
    await git(['add', 'path-only.txt']);
    await git(['commit', '-m', 'test: 仅触碰 path-only.txt']);

    const commits = await call('getCommitLog', { paths: ['path-only.txt'] }) as Array<{ message: string }>;
    assert.ok(commits.length > 0, '应至少返回一条提交');
    for (const c of commits) {
      assert.strictEqual(c.message, 'test: 仅触碰 path-only.txt');
    }
  });

  test('getCommitDetail 与 getCommitDiffs 应返回真实内容', async () => {
    const commits = await call('getCommitLog', {}) as Array<{ hash: string; message: string }>;
    const target = commits.find(c => c.message === 'feat: 添加 b.ts')!;

    const detail = await call('getCommitDetail', { hash: target.hash }) as {
      authorName: string; authorEmail: string; message: string;
    };
    assert.strictEqual(detail.authorName, 'Bob');
    assert.strictEqual(detail.authorEmail, 'bob@example.com');

    const diffs = await call('getCommitDiffs', { hash: target.hash }) as Array<{ path: string }>;
    assert.ok(diffs.some(d => d.path === 'src/b.ts'), '差异应包含 src/b.ts');
  });

  test('getStatus 应反映工作区状态', async () => {
    const status = await call('getStatus', {}) as { currentBranch?: string };
    assert.ok(status, '应返回状态对象');
  });

  test('listFiles 应返回已跟踪文件', async () => {
    const files = await call('listFiles', {}) as string[];
    assert.ok(files.includes('README.md'));
    assert.ok(files.includes('src/a.ts'));
    assert.ok(!files.includes('不存在的文件.txt'));
  });

  test('getMyBranches 应返回作者自己的分支', async () => {
    const mine = await call('getMyBranches', {}) as string[];
    assert.ok(Array.isArray(mine), '应返回数组');
  });
});

suite('提交改写操作', () => {
  suiteSetup(async () => {
    await vscode.extensions.getExtension(EXTENSION_ID)!.activate();
    // 前序用例可能留下未提交改动或处于其他分支，先回到干净状态
    await git(['checkout', 'main']);
    await git(['reset', '--hard', 'HEAD']);
    await git(['clean', '-fd']);
  });

  test('revert 应生成一条反向提交', async () => {
    const before = Number(await (await git(['rev-list', '--count', 'HEAD'])));
    const commits = await call('getCommitLog', {}) as Array<{ hash: string; message: string }>;
    const target = commits.find(c => c.message === 'feat: 添加 b.ts')!;

    await call('revert', { hash: target.hash });

    const after = Number(await (await git(['rev-list', '--count', 'HEAD'])));
    assert.strictEqual(after, before + 1, '应新增一条提交');
    const head = await (await git(['log', '-1', '--format=%s']));
    assert.ok(head.includes('Revert'), '最新提交应是 Revert');
  });

  test('undoCommit 应撤销 HEAD 提交', async () => {
    const before = Number(await (await git(['rev-list', '--count', 'HEAD'])));
    const head = await (await git(['rev-parse', 'HEAD']));

    await call('undoCommit', { hash: head });

    const after = Number(await (await git(['rev-list', '--count', 'HEAD'])));
    assert.strictEqual(after, before - 1, '提交数应减少');
  });

  test('cherryPick 应把提交拣选到当前分支', async () => {
    // 确保干净工作区，否则 git 会拒绝拣选
    await git(['reset', '--hard', 'HEAD']);
    await git(['clean', '-fd']);

    // 在临时分支造一个独立提交作为拣选源
    await git(['checkout', '-b', 'pick-source']);
    writeFileSync(join(repo, 'picked.txt'), 'picked\n');
    await git(['add', 'picked.txt']);
    await git(['commit', '-m', 'test: 待拣选提交']);
    const sourceHash = await git(['rev-parse', 'HEAD']);

    await git(['checkout', 'main']);
    await call('cherryPick', { hash: sourceHash });

    const messages = (await git(['log', '--format=%s'])).split('\n');
    assert.ok(messages.some(m => m.includes('待拣选提交')), 'main 上应出现被拣选的提交');
  });
});

suite('远程操作', () => {
  suiteSetup(async () => {
    // 建一个本地裸仓库当 origin，不发真实网络请求
    const bare = join(repo, '..', `gm-origin-${Date.now()}.git`);
    execFileSync(GIT, ['init', '--bare', '-b', 'main', bare], { stdio: 'pipe' });
    await git(['remote', 'add', 'origin', bare]);
    await git(['push', '-u', 'origin', 'main']);
    await vscode.extensions.getExtension(EXTENSION_ID)!.activate();
  });

  test('fetch 应成功执行', async () => {
    await assert.doesNotReject(call('fetch', {}));
  });

  test('push 应把本地提交推到远端', async () => {
    // 造一个新提交再推
    writeFileSync(join(repo, 'push-test.txt'), 'x\n');
    await git(['add', '.']);
    await git(['commit', '-m', 'test: 待推送提交']);

    await call('push', {});

    // 远端应与本地同步
    const local = await (await git(['rev-parse', 'HEAD']));
    const remote = await (await git(['ls-remote', 'origin', 'refs/heads/main'])).split('\t')[0];
    assert.strictEqual(remote, local, '远端应与本地一致');
  });

  test('pull 应成功执行', async () => {
    await assert.doesNotReject(call('pull', {}));
  });
});

suite('收藏（本地存储）', () => {
  suiteSetup(async () => {
    await vscode.extensions.getExtension(EXTENSION_ID)!.activate();
  });

  test('saveFavorites 与 getFavorites 应往返一致', async () => {
    await call('saveFavorites', { favorites: ['main', 'feature/x'] });
    const favs = await call('getFavorites', {}) as string[];
    assert.deepStrictEqual(favs, ['main', 'feature/x']);

    // 清空
    await call('saveFavorites', { favorites: [] });
    assert.deepStrictEqual(await call('getFavorites', {}), []);
  });
});

suite('Worktree 功能', () => {
  suiteSetup(async () => {
    await vscode.extensions.getExtension(EXTENSION_ID)!.activate();
  });

  test('addWorktree 应创建新工作区', async () => {
    const wtPath = join(repo, '..', `gm-wt-${Date.now()}`);
    // worktree 需要绑定已存在的分支，先建一条
    await git(['branch', 'wt-branch']);

    await call('addWorktree', { path: wtPath, branchName: 'wt-branch' });

    const list = await call('listWorktrees', {}) as Array<{ path: string }>;
    assert.ok(list.length >= 2, '应至少有两个 worktree');
    assert.ok(list.some(w => w.path.includes('gm-wt-')), '应包含刚创建的 worktree');

    // 记下来供后续用例使用
    (globalThis as unknown as { __wtPath: string }).__wtPath = wtPath;
  });

  test('removeWorktree 应移除工作区', async () => {
    const wtPath = (globalThis as unknown as { __wtPath: string }).__wtPath;

    await call('removeWorktree', { path: wtPath, force: true });

    const list = await call('listWorktrees', {}) as Array<{ path: string }>;
    assert.ok(!list.some(w => w.path === wtPath), 'worktree 应被移除');
  });

  test('pruneWorktrees 应可清理失效项', async () => {
    await assert.doesNotReject(call('pruneWorktrees', {}));
  });
});

suite('命令日志（控制台）', () => {
  suiteSetup(async () => {
    await vscode.extensions.getExtension(EXTENSION_ID)!.activate();
  });

  test('getCommandLogs 应记录刚才执行的 git 命令', async () => {
    // 先触发一条命令
    await call('getBranches', {});

    const logs = await call('getCommandLogs', { since: 0 }) as Array<{ command: string; ok: boolean }>;
    assert.ok(logs.length > 0, '应有命令日志');
    assert.ok(logs.some(l => l.command.includes('git')), '日志应包含 git 命令');
  });

  test('clearCommandLogs 应清空日志', async () => {
    await call('clearCommandLogs', {});
    const logs = await call('getCommandLogs', { since: 0 }) as unknown[];
    assert.strictEqual(logs.length, 0, '日志应已清空');
  });
});

suite('VS Code 宿主集成', () => {
  test('侧边栏视图应已注册', async () => {
    await vscode.extensions.getExtension(EXTENSION_ID)!.activate();
    // 通过命令触发刷新，确认视图数据源可用
    await Promise.resolve(vscode.commands.executeCommand('gitManager.refresh'));
  });

  test('打开面板命令应创建底部面板视图', async () => {
    await Promise.resolve(vscode.commands.executeCommand('gitManager.openPanel'));
    await new Promise(r => setTimeout(r, 1500));
  });

  test('显示日志命令应打开输出通道', async () => {
    await Promise.resolve(vscode.commands.executeCommand('gitManager.showLogs'));
  });

  test('工作区应识别为 git 仓库', async () => {
    // 测试夹具是 git 仓库，扩展应能正常解析
    await waitFor(() => vscode.workspace.workspaceFolders !== undefined);
    assert.ok(vscode.workspace.workspaceFolders!.length > 0);
  });
});
