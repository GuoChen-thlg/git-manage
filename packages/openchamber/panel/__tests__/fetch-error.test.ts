/**
 * Fetch 错误分类单元测试
 * 覆盖：认证失败、远程不可达、远程不存在、其余归为通用失败
 */

import { describe, it, expect } from 'vitest';
import { classifyFetchError } from '../main';

describe('classifyFetchError', () => {
  it('认证相关错误应归类为认证失败', () => {
    expect(classifyFetchError('fatal: Authentication failed for repository')).toBe('sidebar.fetchAuthFailed');
    expect(classifyFetchError('fatal: could not read Username for origin')).toBe('sidebar.fetchAuthFailed');
    expect(classifyFetchError('Permission denied (publickey)')).toBe('sidebar.fetchAuthFailed');
  });

  it('网络相关错误应归类为无法连接', () => {
    expect(classifyFetchError('fatal: unable to access: Could not resolve host: github.com'))
      .toBe('sidebar.fetchUnreachable');
    expect(classifyFetchError('fatal: Connection timed out')).toBe('sidebar.fetchUnreachable');
    expect(classifyFetchError('Failed to connect to github.com port 443')).toBe('sidebar.fetchUnreachable');
  });

  it('远程不存在相关错误应单独归类', () => {
    expect(classifyFetchError("fatal: 'origin' does not appear to be a git repository"))
      .toBe('sidebar.fetchNoRemote');
    expect(classifyFetchError('fatal: No such remote origin')).toBe('sidebar.fetchNoRemote');
  });

  it('其余错误应归为通用失败', () => {
    expect(classifyFetchError('something unexpected happened')).toBe('sidebar.fetchFailed');
    expect(classifyFetchError('')).toBe('sidebar.fetchFailed');
  });
});
