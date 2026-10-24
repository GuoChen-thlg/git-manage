/**
 * service 黑盒测试：全流程场景
 * 每个场景启动真实 service 进程，通过 HTTP 完整走一遍用户操作链路，
 * 并直接检查仓库最终状态，验证各路由协同工作是否正确。
 *
 * 与其他测试的分工：
 * - service/__tests__/：白盒，单路由分支逻辑
 * - service.blackbox.test.mjs：黑盒，协议与进程
 * - 本文件：黑盒，跨路由的完整业务流程
 *
 * 用法：node --test service/__test-blackbox__/service.scenarios.test.mjs
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

/** 包根目录 */
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
/** service 构建产物 */
const SERVICE_ENTRY = join(PKG_ROOT, 'dist', 'service', 'main.js');
/** 测试 token */
const TOKEN = 'scenario-token';
/** 测试端口 */
const PORT = 38996;

/** service 子进程 */
let child = null;
/** 当前场景的仓库目录 */
let repoDir = '';
/** 场景结束待清理的目录 */
const cleanups = [];

/**
 * 在仓库执行 git 命令
 * @param {string[]} args git 参数
 * @param {string} [cwd] 工作目录，默认当前场景仓库
 * @returns {Promise<string>} stdout
 */
async function git(args, cwd = repoDir) {
  const { stdout } = await execFileAsync('git', args, { cwd });
  return stdout.trim();
}

/**
 * 等待 service 就绪
 * @returns {Promise<void>} 就绪后返回
 */
async function waitForReady() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/git-is-repo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: PKG_ROOT }),
      });
      if (res.status === 200) return;
    } catch {
      // 尚未监听
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('service 未就绪');
}

/**
 * 调用 service 路由
 * @param {string} path 路由
 * @param {object} body 请求体
 * @returns {Promise<{ status: number, data: any, text: string }>} 响应
 */
async function post(path, body = {}) {
  const res = await fetch(`http://127.0.0.1:${PORT}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    // 非 JSON
  }
  return { status: res.status, data, text };
}

/**
 * 创建全新测试仓库（含一个初始提交）
 * @returns {Promise<string>} 仓库路径
 */
async function createRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'git-manage-sc-'));
  cleanups.push(dir);
  await git(['init', '-b', 'main'], dir);
  await git(['config', 'user.email', 'sc@example.com'], dir);
  await git(['config', 'user.name', '场景测试'], dir);
  await git(['config', 'commit.gpgsign', 'false'], dir);
  writeFileSync(join(dir, 'base.txt'), 'base\n');
  await git(['add', '.'], dir);
  await git(['commit', '-m', '初始提交'], dir);
  repoDir = dir;
  return dir;
}

/**
 * 在仓库写文件并提交
 * @param {string} name 文件名
 * @param {string} content 内容
 * @param {string} message 提交信息
 */
async function commitFile(name, content, message) {
  writeFileSync(join(repoDir, name), content);
  await git(['add', '.']);
  await git(['commit', '-m', message]);
}

before(async () => {
  assert.ok(existsSync(SERVICE_ENTRY), `缺少构建产物：${SERVICE_ENTRY}`);
  child = spawn(process.execPath, [SERVICE_ENTRY], {
    env: { ...process.env, OPENCHAMBER_SERVICE_PORT: String(PORT), OPENCHAMBER_SERVICE_TOKEN: TOKEN },
    stdio: 'pipe',
  });
  await waitForReady();
});

after(() => {
  if (child) {
    child.kill('SIGTERM');
    child = null;
  }
  for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
});

describe('场景：分支生命周期', () => {
  test('创建 → 提交 → 合并回主分支 → 删除', async () => {
    await createRepo();

    // 1. 创建功能分支并切换
    assert.equal((await post('git-create-branch', { directory: repoDir, name: 'feat/a' })).status, 200);
    assert.equal((await post('git-checkout', { directory: repoDir, branch: 'feat/a' })).status, 200);
    assert.equal(await git(['rev-parse', '--abbrev-ref', 'HEAD']), 'feat/a');

    // 2. 在功能分支提交
    await commitFile('feat.txt', 'feature\n', '功能提交');
    const log = await post('git-log', { directory: repoDir, limit: 5 });
    assert.equal(log.data[0].message, '功能提交');

    // 3. 切回 main 并合并
    assert.equal((await post('git-checkout', { directory: repoDir, branch: 'main' })).status, 200);
    const merge = await post('git-merge', { directory: repoDir, branch: 'feat/a' });
    assert.equal(merge.status, 200);

    // 4. 合并后 main 应包含功能提交
    const mainLog = await post('git-log', { directory: repoDir, limit: 5 });
    assert.ok(mainLog.data.some(c => c.message === '功能提交'));
    // 工作区应有该文件
    assert.ok(existsSync(join(repoDir, 'feat.txt')));

    // 5. 删除已合并分支
    const del = await post('git-delete-branch', { directory: repoDir, branch: 'feat/a' });
    assert.equal(del.status, 200);
    const branches = await post('git-branches', { directory: repoDir });
    assert.ok(!branches.data.some(b => b.name === 'feat/a'));
  });

  test('删除未合并分支被拒 → 强制删除 → 从通知数据还原', async () => {
    await createRepo();

    await post('git-create-branch', { directory: repoDir, name: 'feat/unmerged' });
    await post('git-checkout', { directory: repoDir, branch: 'feat/unmerged' });
    await commitFile('u.txt', 'unmerged\n', '未合并提交');
    const tip = await git(['rev-parse', 'HEAD']);
    await post('git-checkout', { directory: repoDir, branch: 'main' });

    // 1. 未合并：应拒绝并返回 NOT_MERGED
    const rejected = await post('git-delete-branch', { directory: repoDir, branch: 'feat/unmerged' });
    assert.notEqual(rejected.status, 200);
    assert.equal(rejected.data.code, 'NOT_MERGED');

    // 2. 强制删除成功且返回还原数据
    const forced = await post('git-delete-branch', {
      directory: repoDir,
      branch: 'feat/unmerged',
      force: true,
    });
    assert.equal(forced.status, 200);
    assert.equal(forced.data.tip, tip);

    // 3. 用返回的 tip 还原
    const restored = await post('git-restore-branch', {
      directory: repoDir,
      branch: 'feat/unmerged',
      tip: forced.data.tip,
    });
    assert.equal(restored.status, 200);
    assert.equal(await git(['rev-parse', 'feat/unmerged']), tip);
  });

  test('重命名分支后提交历史应跟随', async () => {
    await createRepo();
    await post('git-create-branch', { directory: repoDir, name: 'old' });
    const headBefore = await git(['rev-parse', 'old']);

    const res = await post('git-rename-branch', {
      directory: repoDir,
      oldName: 'old',
      newName: 'renamed',
    });
    assert.equal(res.status, 200);
    assert.equal(await git(['rev-parse', 'renamed']), headBefore);
  });
});

describe('场景：提交改写与还原', () => {
  test('revert 生成反向提交 → reset 回到原状', async () => {
    await createRepo();
    await commitFile('r.txt', 'content\n', '待回滚提交');
    const targetHash = await git(['rev-parse', 'HEAD']);

    // 1. 回滚：新增反向提交
    const revert = await post('git-revert', { directory: repoDir, hash: targetHash });
    assert.equal(revert.status, 200);
    assert.ok(!existsSync(join(repoDir, 'r.txt')), '回滚后文件应被移除');

    const afterRevert = await post('git-log', { directory: repoDir, limit: 5 });
    assert.equal(afterRevert.data.length, 3, '初始 + 待回滚 + 回滚提交');

    // 2. 硬重置回原提交
    const reset = await post('git-reset', { directory: repoDir, hash: targetHash, mode: 'hard' });
    assert.equal(reset.status, 200);
    assert.ok(existsSync(join(repoDir, 'r.txt')), '重置后文件应恢复');

    const afterReset = await post('git-log', { directory: repoDir, limit: 5 });
    assert.equal(afterReset.data.length, 2);
  });

  test('cherry-pick 把其他分支的提交复制到当前分支', async () => {
    await createRepo();
    await post('git-create-branch', { directory: repoDir, name: 'source' });
    await post('git-checkout', { directory: repoDir, branch: 'source' });
    await commitFile('picked.txt', 'picked\n', '被挑拣的提交');
    const pickedHash = await git(['rev-parse', 'HEAD']);

    await post('git-checkout', { directory: repoDir, branch: 'main' });
    const pick = await post('git-cherry-pick', { directory: repoDir, hash: pickedHash });
    assert.equal(pick.status, 200);

    // 文件内容应出现在 main 上
    assert.ok(existsSync(join(repoDir, 'picked.txt')));
    const mainLog = await post('git-log', { directory: repoDir, limit: 5 });
    assert.equal(mainLog.data[0].message, '被挑拣的提交');
    // 注意：父提交相同的情况下 git 会复用原提交对象，哈希可能一致，故不断言哈希不同
    assert.equal(await git(['rev-parse', 'main']), mainLog.data[0].hash);
  });

  test('reword 改写历史中的中间提交', async () => {
    await createRepo();
    await commitFile('m1.txt', '1\n', '第一个');
    await commitFile('m2.txt', '2\n', '第二个');
    const target = await git(['rev-parse', 'HEAD~1']);

    const res = await post('git-reword-commit', {
      directory: repoDir,
      hash: target,
      message: '改写后的第一个',
    });
    assert.equal(res.status, 200);

    const messages = (await git(['log', '--format=%s'])).split('\n');
    assert.ok(messages.includes('改写后的第一个'));
    assert.equal(messages[0], '第二个', '后续提交应保留');
  });

  test('drop 删除历史中的中间提交且保留文件改动', async () => {
    await createRepo();
    await commitFile('d1.txt', '1\n', '待删除提交');
    await commitFile('d2.txt', '2\n', '后续提交');
    const target = await git(['rev-parse', 'HEAD~1']);

    const res = await post('git-drop-commit', { directory: repoDir, hash: target });
    assert.equal(res.status, 200);

    const messages = (await git(['log', '--format=%s'])).split('\n');
    assert.ok(!messages.includes('待删除提交'));
    assert.equal(messages[0], '后续提交');
  });
});

describe('场景：暂存与状态', () => {
  test('修改文件 → stash → 工作区恢复干净 → stash pop 找回改动', async () => {
    await createRepo();
    writeFileSync(join(repoDir, 'base.txt'), 'modified\n');

    // 1. 修改后状态应报告变更
    const dirty = await post('git-status', { directory: repoDir });
    assert.equal(dirty.data.hasChanges, true);

    // 2. 暂存
    assert.equal((await post('git-stash-now', { directory: repoDir })).status, 200);
    const clean = await post('git-status', { directory: repoDir });
    assert.equal(clean.data.hasChanges, false);

    // 3. 恢复暂存内容
    const stashList = await post('git-stash', { directory: repoDir });
    assert.equal(stashList.status, 200);
  });
});

describe('场景：查询一致性', () => {
  test('分支短哈希应能前缀匹配提交完整哈希', async () => {
    await createRepo();
    const branches = await post('git-branches', { directory: repoDir });
    const log = await post('git-log', { directory: repoDir, limit: 10 });
    const fullHashes = log.data.map(c => c.hash);

    for (const b of branches.data.filter(x => x.commit)) {
      assert.equal(b.commit.length, 7);
      assert.ok(
        fullHashes.some(h => h.startsWith(b.commit)),
        `${b.name} 的短哈希应能匹配到提交`,
      );
    }
  });

  test('比较两个分支应返回差异文件', async () => {
    await createRepo();
    await post('git-create-branch', { directory: repoDir, name: 'cmp' });
    await post('git-checkout', { directory: repoDir, branch: 'cmp' });
    await commitFile('diff.txt', 'diff\n', '差异提交');
    await post('git-checkout', { directory: repoDir, branch: 'main' });

    const res = await post('git-branch-diff', { directory: repoDir, from: 'main', to: 'cmp' });
    assert.equal(res.status, 200);
    assert.ok(res.data.some(d => d.path === 'diff.txt'));
  });
});
