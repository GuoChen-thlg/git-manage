/**
 * service 路由测试：面板调试日志
 * 验证 /git-debug-log 的开关控制、用户目录落盘与大小上限截断
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const TOKEN = 'test-token';

/** 测试用的伪 HOME 目录（os.homedir() 在 POSIX 下优先读 HOME） */
let fakeHome: string;

/** 保存原始环境变量，afterEach 恢复避免污染其他用例 */
const originalEnv: Record<string, string | undefined> = {};

/**
 * 调用 service 路由
 * @param path 路由路径
 * @param body 请求体
 * @returns 状态码与响应数据
 */
async function call(path: string, body: Record<string, unknown> = {}): Promise<{
  status: number;
  data: unknown;
}> {
  const { handleRequest } = await import('../main');
  const res = await handleRequest(
    new Request(`http://localhost/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  const text = await res.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    // 非 JSON 保留原文
  }
  return { status: res.status, data };
}

/**
 * 按当前平台推导日志文件应落盘的路径（与 service 内的解析规则对齐）
 * @returns 日志文件绝对路径
 */
function expectedLogPath(): string {
  if (process.platform === 'win32') {
    return join(fakeHome, 'AppData', 'Roaming', 'git-manage', 'gitpanel-debug.log');
  }
  if (process.platform === 'darwin') {
    return join(fakeHome, 'Library', 'Logs', 'git-manage', 'gitpanel-debug.log');
  }
  return join(fakeHome, '.config', 'git-manage', 'gitpanel-debug.log');
}

describe('service 路由：面板调试日志', () => {
  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), 'git-manage-debug-log-'));
    for (const key of ['HOME', 'USERPROFILE', 'XDG_CONFIG_HOME', 'APPDATA', 'GIT_MANAGE_DEBUG', 'OPENCHAMBER_SERVICE_TOKEN']) {
      originalEnv[key] = process.env[key];
    }
    // 指向临时 HOME，避免写入真实用户目录；清掉会让 homedir() 绕过 HOME 的变量
    process.env.HOME = fakeHome;
    process.env.USERPROFILE = fakeHome;
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.APPDATA;
    process.env.OPENCHAMBER_SERVICE_TOKEN = TOKEN;
    vi.resetModules();
  });

  afterEach(() => {
    // 恢复原始环境变量
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it('开关关闭时应返回成功且不写日志文件', async () => {
    delete process.env.GIT_MANAGE_DEBUG;

    const { status, data } = await call('git-debug-log', { event: 'panel-loaded', data: {} });

    expect(status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(existsSync(expectedLogPath())).toBe(false);
  });

  it('开关开启时应写入用户目录下的日志文件', async () => {
    process.env.GIT_MANAGE_DEBUG = '1';

    const { status, data } = await call('git-debug-log', { event: 'panel-loaded', data: { ts: '2026-01-01' } });

    expect(status).toBe(200);
    expect(data).toEqual({ success: true });
    const logPath = expectedLogPath();
    expect(existsSync(logPath)).toBe(true);
    const content = readFileSync(logPath, 'utf8');
    expect(content).toContain('"event":"panel-loaded"');
    expect(content).toContain('"ts":"2026-01-01"');
  });

  it('开关开启时应支持多行追加', async () => {
    process.env.GIT_MANAGE_DEBUG = 'true';

    await call('git-debug-log', { event: 'first', data: {} });
    await call('git-debug-log', { event: 'second', data: {} });

    const content = readFileSync(expectedLogPath(), 'utf8');
    expect(content.split('\n').filter(Boolean)).toHaveLength(2);
    expect(content).toContain('"event":"first"');
    expect(content).toContain('"event":"second"');
  });

  it('日志超过大小上限时应截断重写只保留最新一行', async () => {
    process.env.GIT_MANAGE_DEBUG = '1';
    const logPath = expectedLogPath();
    mkdirSync(dirname(logPath), { recursive: true });
    // 预置超限文件（1MiB 上限），再写一行应触发截断
    writeFileSync(logPath, 'x'.repeat(1024 * 1024 + 1), 'utf8');

    await call('git-debug-log', { event: 'after-overflow', data: {} });

    const content = readFileSync(logPath, 'utf8');
    expect(content).toContain('"event":"after-overflow"');
    expect(content).not.toContain('xxx');
    // 截断后文件只应包含最新一行
    expect(content.split('\n').filter(Boolean)).toHaveLength(1);
  });

  it('未超限时日志文件应持续增长', async () => {
    process.env.GIT_MANAGE_DEBUG = '1';
    const logPath = expectedLogPath();

    await call('git-debug-log', { event: 'small-1', data: {} });
    const sizeAfterFirst = statSync(logPath).size;
    await call('git-debug-log', { event: 'small-2', data: {} });

    expect(statSync(logPath).size).toBeGreaterThan(sizeAfterFirst);
  });

  it('未授权的请求应返回 401', async () => {
    process.env.GIT_MANAGE_DEBUG = '1';
    const { handleRequest } = await import('../main');
    const res = await handleRequest(
      new Request('http://localhost/git-debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'unauthorized', data: {} }),
      }),
    );

    expect(res.status).toBe(401);
    expect(existsSync(expectedLogPath())).toBe(false);
  });
});
