/**
 * service 黑盒测试
 * 启动真实的 service 进程，全程通过 HTTP 请求验证行为，不依赖内部实现。
 *
 * 与 service/__tests__/ 下的白盒测试互补：
 * - 白盒测试直接调用 handleRequest，覆盖分支逻辑与错误处理
 * - 黑盒测试验证真实进程能启动、端口监听、请求解析、鉴权与响应序列化
 *
 * 用法：node --test service/__test-blackbox__/service.blackbox.test.mjs
 * 注意：需先执行 npm run build:service 生成 dist/service/main.js
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
/** service 构建产物路径 */
const SERVICE_ENTRY = join(PKG_ROOT, 'dist', 'service', 'main.js');

/** 测试用 token */
const TOKEN = 'blackbox-token';
/** 测试用端口（避开宿主常用端口） */
const PORT = 38997;

/** service 子进程 */
let child = null;
/** 测试仓库目录 */
let repoDir = '';
/** 非 git 目录 */
let plainDir = '';

/**
 * 在测试仓库执行 git 命令
 * @param {string[]} args git 参数
 * @returns {Promise<string>} stdout
 */
async function git(args) {
  const { stdout } = await execFileAsync('git', args, { cwd: repoDir });
  return stdout.trim();
}

/**
 * 等待 service 端口可用
 * @param {number} timeoutMs 超时毫秒
 * @returns {Promise<void>} 就绪后返回
 */
async function waitForReady(timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/git-is-repo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: plainDir }),
      });
      if (res.status === 200) return;
    } catch {
      // 端口尚未监听，继续等待
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('service 未在预期时间内就绪');
}

/**
 * 通过 HTTP 调用 service
 * @param {string} path 路由（不含前导 /）
 * @param {object} body 请求体
 * @param {{ token?: string | null }} [options] 附加选项
 * @returns {Promise<{ status: number, data: any, text: string }>} 响应
 */
async function post(path, body = {}, options = {}) {
  const token = options.token === undefined ? TOKEN : options.token;
  /** @type {Record<string, string>} */
  const headers = { 'Content-Type': 'application/json' };
  if (token !== null) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    // 非 JSON 保留原文
  }
  return { status: res.status, data, text };
}

describe('service 黑盒测试', () => {
  before(async () => {
    assert.ok(existsSync(SERVICE_ENTRY), `缺少构建产物：${SERVICE_ENTRY}，请先运行 npm run build:service`);

    // 准备测试仓库
    repoDir = mkdtempSync(join(tmpdir(), 'git-manage-bb-'));
    plainDir = mkdtempSync(join(tmpdir(), 'git-manage-bb-plain-'));
    await git(['init', '-b', 'main']);
    await git(['config', 'user.email', 'bb@example.com']);
    await git(['config', 'user.name', '黑盒测试']);
    await git(['config', 'commit.gpgsign', 'false']);
    writeFileSync(join(repoDir, 'a.txt'), 'a\n');
    await git(['add', '.']);
    await git(['commit', '-m', '首个提交']);
    writeFileSync(join(repoDir, 'b.txt'), 'b\n');
    await git(['add', '.']);
    await git(['commit', '-m', '第二个提交']);

    // 启动真实 service 进程
    child = spawn(process.execPath, [SERVICE_ENTRY], {
      env: { ...process.env, OPENCHAMBER_SERVICE_PORT: String(PORT), OPENCHAMBER_SERVICE_TOKEN: TOKEN },
      stdio: 'pipe',
    });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += String(d); });
    child.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error('[黑盒] service 进程异常退出', code, stderr);
      }
    });

    await waitForReady();
  });

  after(() => {
    if (child) {
      child.kill('SIGTERM');
      child = null;
    }
    if (repoDir) rmSync(repoDir, { recursive: true, force: true });
    if (plainDir) rmSync(plainDir, { recursive: true, force: true });
  });

  describe('进程与协议', () => {
    test('service 应监听端口并响应健康请求', async () => {
      const res = await post('git-is-repo', { directory: repoDir });
      assert.equal(res.status, 200);
      assert.equal(res.data, true);
    });

    test('缺少 token 应返回 401', async () => {
      const res = await post('git-is-repo', { directory: repoDir }, { token: null });
      assert.equal(res.status, 401);
    });

    test('错误 token 应返回 401', async () => {
      const res = await post('git-is-repo', { directory: repoDir }, { token: 'wrong' });
      assert.equal(res.status, 401);
    });

    test('未知路由应返回 404', async () => {
      const res = await post('git-unknown-route', { directory: repoDir });
      assert.equal(res.status, 404);
    });

    test('缺 directory 的请求不应使服务崩溃', async () => {
      const res = await fetch(`http://127.0.0.1:${PORT}/git-is-repo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      // 该路由在 cwd 缺省时会回退到进程目录，状态码不作为契约；
      // 这里只要求服务存活且仍能正常响应后续请求
      assert.ok(res.status > 0);
      const alive = await post('git-is-repo', { directory: repoDir });
      assert.equal(alive.status, 200);
    });
  });

  describe('数据往返', () => {
    test('git-log 应返回提交列表且字段完整', async () => {
      const res = await post('git-log', { directory: repoDir, limit: 10 });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
      assert.equal(res.data.length, 2);
      const first = res.data[0];
      assert.equal(first.message, '第二个提交');
      assert.equal(first.hash.length, 40);
      assert.equal(first.shortHash.length, 7);
      assert.ok(first.date);
      assert.ok(first.commitDate);
    });

    test('git-branches 应返回分支且 commit 为短哈希', async () => {
      const res = await post('git-branches', { directory: repoDir });
      assert.equal(res.status, 200);
      const main = res.data.find(b => b.name === 'main');
      assert.ok(main);
      assert.equal(main.isCurrent, true);
      assert.equal(main.commit.length, 7);
    });

    test('git-commit-detail 应返回指定提交', async () => {
      const log = await post('git-log', { directory: repoDir, limit: 1 });
      const head = log.data[0].hash;
      const res = await post('git-commit-detail', { directory: repoDir, hash: head });
      assert.equal(res.status, 200);
      assert.equal(res.data.message, '第二个提交');
    });
  });

  describe('写操作副作用', () => {
    test('创建分支后应能在分支列表中查到', async () => {
      const res = await post('git-create-branch', { directory: repoDir, name: 'bb-feature' });
      assert.equal(res.status, 200);

      const list = await post('git-branches', { directory: repoDir });
      assert.ok(list.data.some(b => b.name === 'bb-feature'));
    });

    test('撤销提交应真正改变仓库状态', async () => {
      const before = (await git(['log', '--format=%H'])).split('\n').length;
      const log = await post('git-log', { directory: repoDir, limit: 1 });
      const head = log.data[0].hash;

      const res = await post('git-undo-commit', { directory: repoDir, hash: head });
      assert.equal(res.status, 200);

      const after = (await git(['log', '--format=%H'])).split('\n').length;
      assert.equal(after, before - 1, '提交数应减少一条');
    });

    test('对非 HEAD 提交撤销应失败并给出原因', async () => {
      // 前一个用例已撤销过 HEAD，这里补一条提交，保证存在「非 HEAD 的较旧提交」
      writeFileSync(join(repoDir, 'c.txt'), 'c\n');
      await git(['add', '.']);
      await git(['commit', '-m', '补充提交']);

      const log = await post('git-log', { directory: repoDir, limit: 5 });
      assert.ok(log.data.length >= 2, '应至少有两个提交');
      const oldHash = log.data[log.data.length - 1].hash;

      const res = await post('git-undo-commit', { directory: repoDir, hash: oldHash });
      assert.notEqual(res.status, 200);
      assert.ok(String(res.data).includes('只能撤销当前分支的最新提交'));
    });
  });

  describe('错误处理', () => {
    test('非 git 目录查询分支应返回错误而非崩溃', async () => {
      const res = await post('git-branches', { directory: plainDir });
      assert.ok(res.status >= 400, `期望错误状态，实际 ${res.status}`);
      // 服务应仍然存活
      const alive = await post('git-is-repo', { directory: repoDir });
      assert.equal(alive.status, 200);
    });

    test('不存在的目录应返回错误', async () => {
      const res = await post('git-is-repo', { directory: '/definitely/not/exists' });
      assert.equal(res.status, 200);
      assert.equal(res.data, false);
    });
  });
});
