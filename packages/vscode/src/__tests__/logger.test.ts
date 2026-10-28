/**
 * 日志系统测试
 * 覆盖：级别过滤、行格式、异常数据序列化、trace 成功与失败、未初始化时的退化行为
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initLogger, log, debug, info, warn, error, trace, disposeLogger,
} from '../logger';

/** 捕获写入输出通道的行 */
const lines: string[] = [];

vi.mock('vscode', () => ({
  window: {
    createOutputChannel: vi.fn((name: string) => ({
      appendLine: (line: string) => { lines.push(line); },
      append: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn(),
      clear: vi.fn(),
      name,
    })),
  },
}));

describe('logger', () => {
  beforeEach(() => {
    lines.length = 0;
    disposeLogger();
  });

  afterEach(() => {
    disposeLogger();
    vi.restoreAllMocks();
  });

  it('每行应包含时间、级别、模块与描述', () => {
    initLogger();
    info('panel', 'test_message', { a: 1 });

    expect(lines).toHaveLength(1);
    const line = lines[0]!;
    expect(line).toMatch(/^\[git-manager\] \d{4}-\d{2}-\d{2}T/);
    expect(line).toContain('INFO');
    expect(line).toContain('[panel]');
    expect(line).toContain('test_message');
    expect(line).toContain('{"a":1}');
  });

  it('未指定数据时不应追加多余内容', () => {
    initLogger();
    warn('panel', 'no_data');
    expect(lines[0]).toContain('no_data');
    expect(lines[0]!.endsWith('no_data')).toBe(true);
  });

  it('debug 级别默认不输出', () => {
    initLogger();
    debug('panel', 'hidden');
    expect(lines).toHaveLength(0);
  });

  it('开启 debug 后应输出', () => {
    initLogger({ debug: true });
    debug('panel', 'visible');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('DEBUG');
  });

  it('无法序列化的数据应退化为字符串而不是抛错', () => {
    initLogger();
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => info('panel', 'circular', circular)).not.toThrow();
    expect(lines[0]).toContain('circular');
  });

  it('错误级别应正确标记', () => {
    initLogger();
    error('handler', 'failed', { code: 1 });
    expect(lines[0]).toContain('ERROR');
  });

  it('trace 成功应记录开始与完成', async () => {
    initLogger({ debug: true });
    const result = await trace('handler', 'op', async () => 42);

    expect(result).toBe(42);
    expect(lines.some(l => l.includes('op_start'))).toBe(true);
    expect(lines.some(l => l.includes('op_done'))).toBe(true);
    expect(lines.some(l => l.includes('durationMs'))).toBe(true);
  });

  it('trace 失败应记录错误并继续抛出', async () => {
    initLogger({ debug: true });
    await expect(trace('handler', 'op', async () => {
      throw new Error('boom');
    })).rejects.toThrow('boom');

    const failed = lines.find(l => l.includes('op_failed'));
    expect(failed).toBeTruthy();
    expect(failed).toContain('boom');
  });

  it('未初始化时应退化到控制台而不是静默丢弃', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    disposeLogger();
    log('info', 'panel', 'fallback');
    expect(spy).toHaveBeenCalled();
  });
});
